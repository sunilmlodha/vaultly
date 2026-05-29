import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { randomUUID } from 'crypto'

export async function GET() {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const result = await db.execute({
    sql: 'SELECT * FROM assets WHERE household_id = ? ORDER BY created_at DESC',
    args: [session.user.householdId],
  })
  return NextResponse.json({ assets: result.rows })
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const id = randomUUID()
  const now = new Date().toISOString()

  await db.execute({
    sql: `INSERT INTO assets (id, user_id, household_id, name, category, value, currency, institution, notes, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [id, session.user.id, session.user.householdId, body.name, body.category, body.value ?? 0, body.currency ?? 'GBP', body.institution ?? null, body.notes ?? null, now, now],
  })

  const asset = await db.execute({ sql: 'SELECT * FROM assets WHERE id = ?', args: [id] })
  return NextResponse.json({ asset: asset.rows[0] }, { status: 201 })
}

export async function PUT(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { id, ...fields } = body
  const now = new Date().toISOString()

  await db.execute({
    sql: `UPDATE assets SET name=?, category=?, value=?, currency=?, institution=?, notes=?, updated_at=?
          WHERE id=? AND household_id=?`,
    args: [fields.name, fields.category, fields.value, fields.currency, fields.institution ?? null, fields.notes ?? null, now, id, session.user.householdId],
  })
  return NextResponse.json({ success: true })
}

export async function DELETE(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await req.json()
  await db.execute({
    sql: 'DELETE FROM assets WHERE id = ? AND household_id = ?',
    args: [id, session.user.householdId],
  })
  return NextResponse.json({ success: true })
}
