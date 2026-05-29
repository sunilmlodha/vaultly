import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { uploadDocument, deleteDocument } from '@/lib/blob'
import { randomUUID } from 'crypto'

export async function GET() {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const result = await db.execute({
    sql: 'SELECT * FROM documents WHERE household_id = ? ORDER BY created_at DESC',
    args: [session.user.householdId],
  })
  return NextResponse.json({ documents: result.rows })
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const formData = await req.formData()
  const file = formData.get('file') as File | null
  const name = formData.get('name') as string
  const category = (formData.get('category') as string) || 'other'
  const notes = (formData.get('notes') as string) || null

  if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })

  const buffer = await file.arrayBuffer()
  const { url, pathname } = await uploadDocument(file.name, buffer, session.user.id)

  const id = randomUUID()
  const now = new Date().toISOString()

  await db.execute({
    sql: `INSERT INTO documents (id, user_id, household_id, name, category, blob_url, blob_pathname, file_size, notes, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [id, session.user.id, session.user.householdId, name || file.name, category, url, pathname, file.size, notes, now],
  })

  const row = await db.execute({ sql: 'SELECT * FROM documents WHERE id = ?', args: [id] })
  return NextResponse.json({ document: row.rows[0] }, { status: 201 })
}

export async function DELETE(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await req.json()

  const existing = await db.execute({
    sql: 'SELECT blob_url FROM documents WHERE id = ? AND household_id = ?',
    args: [id, session.user.householdId],
  })
  if (existing.rows.length === 0) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  await deleteDocument(existing.rows[0].blob_url as string)
  await db.execute({
    sql: 'DELETE FROM documents WHERE id = ? AND household_id = ?',
    args: [id, session.user.householdId],
  })
  return NextResponse.json({ success: true })
}
