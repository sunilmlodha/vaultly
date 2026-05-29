import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { randomUUID } from 'crypto'

export async function GET() {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const result = await db.execute({
    sql: 'SELECT * FROM liabilities WHERE household_id = ? ORDER BY created_at DESC',
    args: [session.user.householdId],
  })
  return NextResponse.json({ liabilities: result.rows })
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const id = randomUUID()
  const now = new Date().toISOString()

  await db.execute({
    sql: `INSERT INTO liabilities (id, user_id, household_id, name, category, balance, currency, interest_rate, monthly_payment, institution, notes, property_value, fixed_rate_end_date, mortgage_term_years, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [id, session.user.id, session.user.householdId, body.name, body.category, body.balance ?? 0, body.currency ?? 'GBP', body.interest_rate ?? null, body.monthly_payment ?? null, body.institution ?? null, body.notes ?? null, body.property_value ?? null, body.fixed_rate_end_date ?? null, body.mortgage_term_years ?? null, now, now],
  })

  const row = await db.execute({ sql: 'SELECT * FROM liabilities WHERE id = ?', args: [id] })
  return NextResponse.json({ liability: row.rows[0] }, { status: 201 })
}

export async function PUT(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { id, ...f } = body
  const now = new Date().toISOString()

  await db.execute({
    sql: `UPDATE liabilities SET name=?, category=?, balance=?, currency=?, interest_rate=?, monthly_payment=?, institution=?, notes=?, property_value=?, fixed_rate_end_date=?, mortgage_term_years=?, updated_at=?
          WHERE id=? AND household_id=?`,
    args: [f.name, f.category, f.balance, f.currency, f.interest_rate ?? null, f.monthly_payment ?? null, f.institution ?? null, f.notes ?? null, f.property_value ?? null, f.fixed_rate_end_date ?? null, f.mortgage_term_years ?? null, now, id, session.user.householdId],
  })
  return NextResponse.json({ success: true })
}

export async function DELETE(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await req.json()
  await db.execute({
    sql: 'DELETE FROM liabilities WHERE id = ? AND household_id = ?',
    args: [id, session.user.householdId],
  })
  return NextResponse.json({ success: true })
}
