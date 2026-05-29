import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { randomUUID } from 'crypto'

export async function GET() {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const members = await db.execute({
    sql: `SELECT hm.*, u.full_name, u.email, u.avatar_url
          FROM household_members hm
          LEFT JOIN users u ON u.id = hm.user_id
          WHERE hm.household_id = ?
          ORDER BY hm.created_at ASC`,
    args: [session.user.householdId],
  })

  const household = await db.execute({
    sql: 'SELECT * FROM households WHERE id = ?',
    args: [session.user.householdId],
  })

  return NextResponse.json({ members: members.rows, household: household.rows[0] })
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { invited_email, role } = await req.json()
  if (!invited_email) return NextResponse.json({ error: 'Email required' }, { status: 400 })

  const id = randomUUID()
  const now = new Date().toISOString()

  await db.execute({
    sql: 'INSERT INTO household_members (id, household_id, invited_email, role, accepted, created_at) VALUES (?, ?, ?, ?, 0, ?)',
    args: [id, session.user.householdId, invited_email, role ?? 'partner', now],
  })

  return NextResponse.json({ success: true }, { status: 201 })
}

export async function DELETE(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await req.json()
  await db.execute({
    sql: "DELETE FROM household_members WHERE id = ? AND household_id = ? AND role != 'owner'",
    args: [id, session.user.householdId],
  })
  return NextResponse.json({ success: true })
}
