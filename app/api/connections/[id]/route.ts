import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'

/**
 * DELETE /api/connections/[id]
 *
 * Cascade-delete an Open Banking connection and all associated data:
 *  1. Null-out ob_account_id on linked assets and liabilities
 *  2. Delete stored transactions
 *  3. Delete ob_account rows
 *  4. Delete the connection row
 *
 * Ownership is verified against the current household before any mutation.
 */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params

  // 1. Verify the connection belongs to this household
  const ownerCheck = await db.execute({
    sql: 'SELECT id FROM open_banking_connections WHERE id = ? AND household_id = ?',
    args: [id, session.user.householdId],
  })

  if (ownerCheck.rows.length === 0) {
    return NextResponse.json({ error: 'Connection not found' }, { status: 404 })
  }

  // 2. Fetch all ob_account IDs for this connection
  const obAccountsResult = await db.execute({
    sql: 'SELECT id FROM open_banking_accounts WHERE connection_id = ?',
    args: [id],
  })

  const obAccountIds = obAccountsResult.rows.map((r) => r.id as string)

  // 3. Null-out ob_account_id on linked assets and liabilities
  for (const obAccountId of obAccountIds) {
    await db.execute({
      sql: 'UPDATE assets SET ob_account_id = NULL WHERE ob_account_id = ?',
      args: [obAccountId],
    })
    await db.execute({
      sql: 'UPDATE liabilities SET ob_account_id = NULL WHERE ob_account_id = ?',
      args: [obAccountId],
    })
  }

  // 4. Delete stored transactions for this connection
  await db.execute({
    sql: 'DELETE FROM ob_transactions WHERE connection_id = ?',
    args: [id],
  })

  // 5. Delete open_banking_accounts rows
  await db.execute({
    sql: 'DELETE FROM open_banking_accounts WHERE connection_id = ?',
    args: [id],
  })

  // 6. Delete the connection itself
  await db.execute({
    sql: 'DELETE FROM open_banking_connections WHERE id = ? AND household_id = ?',
    args: [id, session.user.householdId],
  })

  return NextResponse.json({ success: true })
}
