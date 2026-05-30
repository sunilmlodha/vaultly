import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { parseCSVFile } from '@/lib/csv-parser'
import { randomUUID } from 'crypto'

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const householdId = (session.user as Record<string, unknown>).householdId as string
  if (!householdId) return NextResponse.json({ error: 'No household' }, { status: 400 })

  const formData = await req.formData()
  const file = formData.get('file') as File | null
  const previewOnly = formData.get('preview') === 'true'

  if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })

  const text = await file.text()
  const { format, assets, rawHeaders } = parseCSVFile(text)

  if (previewOnly) {
    return NextResponse.json({ format, assets, rawHeaders, count: assets.length })
  }

  // Bulk insert
  if (assets.length === 0) {
    return NextResponse.json({ error: 'No assets found in CSV' }, { status: 400 })
  }

  await db.batch(
    assets.map(a => ({
      sql: `INSERT INTO assets (id, user_id, household_id, name, category, value, currency, institution, notes)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        randomUUID(), session.user.id, householdId,
        a.name, a.category, a.value, a.currency, a.institution, a.notes,
      ],
    }))
  )

  return NextResponse.json({ imported: assets.length, format })
}
