import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { fetchBalance, refreshTokens, fetchTransactions } from '@/lib/truelayer'
import type { AccountMapping } from '@/lib/types'

export const maxDuration = 60

interface OBAccount {
  id: string
  external_account_id: string
  account_type: string
  account_name: string
  currency: string
  linked_asset_id: string | null
  linked_liability_id: string | null
}

interface Connection {
  id: string
  access_token: string
  refresh_token: string
  token_expires_at: string
  household_id: string
}

/**
 * Background helper — fetch and store transactions for all non-skipped accounts.
 * Used to refresh the data that powers recurring-payment detection.
 */
async function fetchAndStoreTransactions(
  connectionId: string,
  householdId: string,
  accessToken: string,
  accounts: OBAccount[]
): Promise<void> {
  for (const acct of accounts) {
    try {
      const txs = await fetchTransactions(accessToken, acct.external_account_id)
      for (const tx of txs) {
        await db.execute({
          sql: `
            INSERT OR IGNORE INTO ob_transactions
              (id, connection_id, household_id, external_account_id, date, description,
               merchant_name, amount, currency, transaction_type, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `,
          args: [
            tx.id,
            connectionId,
            householdId,
            acct.external_account_id,
            tx.date,
            tx.description,
            tx.merchant_name ?? null,
            tx.amount,
            tx.currency,
            tx.transaction_type,
            new Date().toISOString(),
          ],
        })
      }
    } catch (err) {
      console.error(
        `sync/fetchAndStoreTransactions: failed for account ${acct.external_account_id}`,
        err
      )
    }
  }
}

/**
 * POST /api/connections/[id]/sync
 *
 * Sync balances for all Open Banking accounts in this connection.
 *
 * Steps:
 *  1. Auth guard + ownership verification
 *  2. Refresh access token if it expires within the next 5 minutes
 *  3. For each linked account: fetch latest balance and update assets/liabilities
 *  4. Update connection last_synced_at
 *  5. Background: re-fetch transactions for recurring detection
 *
 * Returns: { success: true, synced: number }
 */
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params

  // 1. Verify ownership and load connection row
  const connResult = await db.execute({
    sql: `
      SELECT id, access_token, refresh_token, token_expires_at, household_id
      FROM open_banking_connections
      WHERE id = ? AND household_id = ?
    `,
    args: [id, session.user.householdId],
  })

  if (connResult.rows.length === 0) {
    return NextResponse.json({ error: 'Connection not found' }, { status: 404 })
  }

  const connection = connResult.rows[0] as unknown as Connection

  // 2. Check if access token will expire within the next 5 minutes
  const expiresAt = new Date(connection.token_expires_at).getTime()
  const fiveMinutesFromNow = Date.now() + 5 * 60 * 1000

  let accessToken = connection.access_token
  const now = new Date().toISOString()

  if (expiresAt < fiveMinutesFromNow) {
    try {
      const refreshed = await refreshTokens(connection.refresh_token)
      accessToken = refreshed.access_token
      const newTokenExpiresAt = new Date(
        Date.now() + refreshed.expires_in * 1000
      ).toISOString()

      // Persist refreshed tokens
      await db.execute({
        sql: `
          UPDATE open_banking_connections
          SET access_token = ?, refresh_token = ?, token_expires_at = ?, updated_at = ?
          WHERE id = ?
        `,
        args: [
          refreshed.access_token,
          refreshed.refresh_token,
          newTokenExpiresAt,
          now,
          id,
        ],
      })
    } catch (err) {
      console.error('sync: token refresh failed', err)

      // Mark connection as errored and return
      await db.execute({
        sql: `UPDATE open_banking_connections SET status = 'error', updated_at = ? WHERE id = ?`,
        args: [now, id],
      })

      return NextResponse.json(
        { error: 'Access token expired and refresh failed' },
        { status: 502 }
      )
    }
  }

  // 3. Load all accounts for this connection
  const accountsResult = await db.execute({
    sql: `
      SELECT id, external_account_id, account_type, account_name, currency,
             linked_asset_id, linked_liability_id
      FROM open_banking_accounts
      WHERE connection_id = ?
    `,
    args: [id],
  })

  const accounts = accountsResult.rows as unknown as OBAccount[]
  let synced = 0

  for (const acct of accounts) {
    try {
      const balance = await fetchBalance(accessToken, acct.external_account_id)
      const syncedAt = new Date().toISOString()

      // Update the ob_account balance
      await db.execute({
        sql: `
          UPDATE open_banking_accounts
          SET balance = ?, last_synced_at = ?
          WHERE id = ?
        `,
        args: [balance, syncedAt, acct.id],
      })

      // Update linked asset value
      if (acct.linked_asset_id) {
        await db.execute({
          sql: 'UPDATE assets SET value = ?, updated_at = ? WHERE id = ?',
          args: [balance, syncedAt, acct.linked_asset_id],
        })
      }

      // Update linked liability balance
      if (acct.linked_liability_id) {
        await db.execute({
          sql: 'UPDATE liabilities SET balance = ?, updated_at = ? WHERE id = ?',
          args: [balance, syncedAt, acct.linked_liability_id],
        })
      }

      synced++
    } catch (err) {
      console.error(
        `sync: balance fetch failed for account ${acct.external_account_id}`,
        err
      )
    }
  }

  // 4. Update connection last_synced_at and status
  await db.execute({
    sql: `
      UPDATE open_banking_connections
      SET last_synced_at = ?, status = 'active', updated_at = ?
      WHERE id = ?
    `,
    args: [now, now, id],
  })

  // 5. Fire-and-forget transaction refresh for recurring detection
  if (accounts.length > 0) {
    // Build AccountMapping-compatible objects from OBAccount rows
    const mappingLike: AccountMapping[] = accounts.map((a) => ({
      external_account_id: a.external_account_id,
      account_type: a.account_type,
      account_name: a.account_name,
      currency: a.currency,
      balance: 0, // not needed for transaction fetch
      decision: a.linked_asset_id ? 'asset' : 'liability',
      category: '',
    }))

    fetchAndStoreTransactions(
      id,
      session.user.householdId,
      accessToken,
      accounts
    ).catch((err) => {
      console.error('sync: background fetchAndStoreTransactions error:', err)
    })

    void mappingLike // suppress unused-var lint warning
  }

  return NextResponse.json({ success: true, synced })
}
