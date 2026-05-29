import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { randomUUID } from 'crypto'

export async function GET() {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const result = await db.execute({
    sql: 'SELECT * FROM goals WHERE household_id = ? ORDER BY created_at DESC',
    args: [session.user.householdId],
  })
  return NextResponse.json({ goals: result.rows })
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const id = randomUUID()
  const now = new Date().toISOString()

  await db.execute({
    sql: `INSERT INTO goals (id, user_id, household_id, name, target_amount, current_amount, currency, target_date, category, notes, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [id, session.user.id, session.user.householdId, body.name, body.target_amount ?? 0, body.current_amount ?? 0, body.currency ?? 'GBP', body.target_date ?? null, body.category ?? 'savings', body.notes ?? null, now, now],
  })

  const row = await db.execute({ sql: 'SELECT * FROM goals WHERE id = ?', args: [id] })
  return NextResponse.json({ goal: row.rows[0] }, { status: 201 })
}

export async function PUT(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { id, ...f } = body
  const now = new Date().toISOString()

  await db.execute({
    sql: `UPDATE goals SET name=?, target_amount=?, current_amount=?, currency=?, target_date=?, category=?, notes=?, updated_at=?
          WHERE id=? AND household_id=?`,
    args: [f.name, f.target_amount, f.current_amount, f.currency, f.target_date ?? null, f.category, f.notes ?? null, now, id, session.user.householdId],
  })
  return NextResponse.json({ success: true })
}

export async function DELETE(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await req.json()
  await db.execute({
    sql: 'DELETE FROM goals WHERE id = ? AND household_id = ?',
    args: [id, session.user.householdId],
  })
  return NextResponse.json({ success: true })
}
