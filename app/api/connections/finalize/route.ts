import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { decryptForSession, fetchTransactions } from '@/lib/truelayer'
import type { AccountMapping } from '@/lib/types'

interface FinalizeBody {
  encrypted_tokens: string
  bank_id: string
  bank_name: string
  bank_logo_url?: string
  consent_expires_at: string
  token_expires_at: string
  mappings: AccountMapping[]
}

interface DecryptedTokens {
  access_token: string
  refresh_token: string
  expires_in: number
  consent_expires_at: string
}

/**
 * Background helper — fetch and store transactions for all non-skipped accounts.
 * Called fire-and-forget; errors are logged but not surfaced to the client.
 */
async function fetchAndStoreTransactions(
  connectionId: string,
  householdId: string,
  accessToken: string,
  mappings: AccountMapping[]
): Promise<void> {
  for (const mapping of mappings) {
    try {
      const txs = await fetchTransactions(accessToken, mapping.external_account_id)
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
            mapping.external_account_id,
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
        `fetchAndStoreTransactions: failed for account ${mapping.external_account_id}`,
        err
      )
    }
  }
}

/**
 * POST /api/connections/finalize
 *
 * Persist the Open Banking connection and create asset/liability records for
 * each account the user chose to track.
 *
 * Body: FinalizeBody (see interface above)
 *
 * Returns: { success: true, connectionId: string }
 */
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: FinalizeBody
  try {
    body = (await req.json()) as FinalizeBody
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const {
    encrypted_tokens,
    bank_id,
    bank_name,
    bank_logo_url,
    consent_expires_at,
    token_expires_at,
    mappings,
  } = body

  if (!encrypted_tokens || !bank_id || !bank_name || !mappings) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  // 1. Decrypt tokens
  let tokens: DecryptedTokens
  try {
    tokens = decryptForSession(encrypted_tokens, session.user.id) as DecryptedTokens
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Token decryption failed'
    return NextResponse.json({ error: message }, { status: 400 })
  }

  const now = new Date().toISOString()
  const connectionId = randomUUID()

  // 2. Insert open_banking_connections row
  await db.execute({
    sql: `
      INSERT INTO open_banking_connections
        (id, household_id, user_id, provider, bank_id, bank_name, bank_logo_url,
         status, consent_expires_at, token_expires_at, access_token, refresh_token,
         created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    args: [
      connectionId,
      session.user.householdId,
      session.user.id,
      'truelayer',
      bank_id,
      bank_name,
      bank_logo_url ?? null,
      'active',
      consent_expires_at,
      token_expires_at,
      tokens.access_token,
      tokens.refresh_token,
      now,
      now,
    ],
  })

  // 3. Process each account mapping
  const activeMappings: AccountMapping[] = []

  for (const mapping of mappings) {
    if (mapping.decision === 'skip') continue

    activeMappings.push(mapping)

    let linkedAssetId: string | null = null
    let linkedLiabilityId: string | null = null
    const entityId = randomUUID()

    if (mapping.decision === 'asset') {
      // Insert asset first
      await db.execute({
        sql: `
          INSERT INTO assets
            (id, user_id, household_id, name, category, value, currency,
             institution, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        args: [
          entityId,
          session.user.id,
          session.user.householdId,
          mapping.account_name,
          mapping.category,
          mapping.balance,
          mapping.currency,
          bank_name,
          now,
          now,
        ],
      })
      linkedAssetId = entityId
    } else {
      // Insert liability first
      await db.execute({
        sql: `
          INSERT INTO liabilities
            (id, user_id, household_id, name, category, balance, currency,
             institution, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        args: [
          entityId,
          session.user.id,
          session.user.householdId,
          mapping.account_name,
          mapping.category,
          mapping.balance,
          mapping.currency,
          bank_name,
          now,
          now,
        ],
      })
      linkedLiabilityId = entityId
    }

    // Insert open_banking_account row
    const obAccountId = randomUUID()
    await db.execute({
      sql: `
        INSERT INTO open_banking_accounts
          (id, connection_id, household_id, external_account_id, account_type,
           account_name, currency, balance, linked_asset_id, linked_liability_id,
           last_synced_at, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      args: [
        obAccountId,
        connectionId,
        session.user.householdId,
        mapping.external_account_id,
        mapping.account_type,
        mapping.account_name,
        mapping.currency,
        mapping.balance,
        linkedAssetId,
        linkedLiabilityId,
        now,
        now,
      ],
    })

    // Back-link the asset/liability to the ob_account row
    if (linkedAssetId) {
      await db.execute({
        sql: 'UPDATE assets SET ob_account_id = ?, updated_at = ? WHERE id = ?',
        args: [obAccountId, now, linkedAssetId],
      })
    } else if (linkedLiabilityId) {
      await db.execute({
        sql: 'UPDATE liabilities SET ob_account_id = ?, updated_at = ? WHERE id = ?',
        args: [obAccountId, now, linkedLiabilityId],
      })
    }
  }

  // 4. Fire-and-forget: seed transaction history for recurring detection
  if (activeMappings.length > 0) {
    fetchAndStoreTransactions(
      connectionId,
      session.user.householdId,
      tokens.access_token,
      activeMappings
    ).catch((err) => {
      console.error('fetchAndStoreTransactions background error:', err)
    })
  }

  return NextResponse.json({ success: true, connectionId }, { status: 201 })
}
