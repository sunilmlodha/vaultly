import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { randomUUID } from 'crypto'

export async function GET() {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const result = await db.execute({
    sql: 'SELECT * FROM renewals WHERE household_id = ? ORDER BY renewal_date ASC',
    args: [session.user.householdId],
  })
  return NextResponse.json({ renewals: result.rows })
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const id = randomUUID()
  const now = new Date().toISOString()

  await db.execute({
    sql: `INSERT INTO renewals (id, user_id, household_id, name, category, amount, currency, renewal_date, provider, auto_renews, notes, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [id, session.user.id, session.user.householdId, body.name, body.category ?? 'subscription', body.amount ?? 0, body.currency ?? 'GBP', body.renewal_date, body.provider ?? null, body.auto_renews ? 1 : 0, body.notes ?? null, now],
  })

  const row = await db.execute({ sql: 'SELECT * FROM renewals WHERE id = ?', args: [id] })
  return NextResponse.json({ renewal: row.rows[0] }, { status: 201 })
}

export async function PUT(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { id, ...f } = body

  await db.execute({
    sql: `UPDATE renewals SET name=?, category=?, amount=?, currency=?, renewal_date=?, provider=?, auto_renews=?, notes=?
          WHERE id=? AND household_id=?`,
    args: [f.name, f.category, f.amount, f.currency, f.renewal_date, f.provider ?? null, f.auto_renews ? 1 : 0, f.notes ?? null, id, session.user.householdId],
  })
  return NextResponse.json({ success: true })
}

export async function DELETE(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await req.json()
  await db.execute({
    sql: 'DELETE FROM renewals WHERE id = ? AND household_id = ?',
    args: [id, session.user.householdId],
  })
  return NextResponse.json({ success: true })
}
