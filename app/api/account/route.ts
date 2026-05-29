import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { del } from '@vercel/blob'

// DELETE /api/account — wipe all data for the authenticated user
export async function DELETE() {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const userId      = session.user.id
  const householdId = session.user.householdId

  try {
    // 1. Fetch all blob URLs before deleting DB records
    const docs = await db.execute({
      sql: 'SELECT blob_url FROM documents WHERE user_id = ?',
      args: [userId],
    })

    // 2. Delete Vercel Blob files (best-effort — don't fail if some missing)
    await Promise.allSettled(
      docs.rows.map((r) => del(r.blob_url as string))
    )

    // 3. If this user owns the household, delete the household
    //    (CASCADE deletes household_members, and all records tied to household_id)
    if (householdId) {
      const household = await db.execute({
        sql: 'SELECT id FROM households WHERE id = ? AND owner_id = ?',
        args: [householdId, userId],
      })
      if (household.rows.length > 0) {
        await db.execute({
          sql: 'DELETE FROM households WHERE id = ?',
          args: [householdId],
        })
      }
    }

    // 4. Delete tables that don't cascade from households
    const tables = [
      'renewal_negotiations',
      'agent_workflows',
      'tracing_requests',
      'employment_records',
      'audit_log',
    ]
    for (const table of tables) {
      await db.execute({ sql: `DELETE FROM ${table} WHERE user_id = ?`, args: [userId] })
    }

    // 5. Delete the user record — cascades to assets, liabilities, renewals, goals, documents
    await db.execute({ sql: 'DELETE FROM users WHERE id = ?', args: [userId] })

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Account deletion failed:', err)
    return NextResponse.json({ error: 'Deletion failed' }, { status: 500 })
  }
}

// GET /api/account — return basic profile info
export async function GET() {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const result = await db.execute({
    sql: 'SELECT id, email, full_name, currency, created_at FROM users WHERE id = ?',
    args: [session.user.id],
  })

  if (result.rows.length === 0) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json({ account: result.rows[0] })
}

// PATCH /api/account — update profile
export async function PATCH(req: Request) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { full_name, currency } = await req.json()
  const now = new Date().toISOString()

  await db.execute({
    sql: 'UPDATE users SET full_name=?, currency=?, updated_at=? WHERE id=?',
    args: [full_name, currency, now, session.user.id],
  })

  return NextResponse.json({ success: true })
}
