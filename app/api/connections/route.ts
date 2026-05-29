import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import type { OpenBankingConnection } from '@/lib/types'

/**
 * GET /api/connections
 *
 * List all Open Banking connections for the current household, each enriched
 * with the number of linked accounts.
 */
export async function GET() {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const result = await db.execute({
    sql: `
      SELECT
        obc.*,
        (
          SELECT COUNT(*)
          FROM open_banking_accounts oba
          WHERE oba.connection_id = obc.id
        ) AS account_count
      FROM open_banking_connections obc
      WHERE obc.household_id = ?
      ORDER BY obc.created_at DESC
    `,
    args: [session.user.householdId],
  })

  const connections = result.rows as unknown as (OpenBankingConnection & {
    account_count: number
  })[]

  return NextResponse.json({ connections })
}
