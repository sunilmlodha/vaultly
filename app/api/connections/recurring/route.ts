import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { detectRecurringPayments } from '@/lib/truelayer'
import type { DetectedRecurring } from '@/lib/types'

interface OBTransactionRow {
  merchant_name: string | null
  description: string
  amount: number
  currency: string
  date: string
}

/**
 * Normalise a name to a lowercase, punctuation-stripped first-4-words key
 * for deduplication against existing renewal names.
 */
function normaliseForComparison(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .trim()
    .split(/\s+/)
    .slice(0, 4)
    .join(' ')
}

/**
 * GET /api/connections/recurring
 *
 * Analyse the last 90 days of stored Open Banking transactions for this
 * household and return detected recurring payment suggestions that are not
 * already tracked in the renewals table.
 *
 * Returns: { suggestions: DetectedRecurring[] }
 */
export async function GET() {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split('T')[0]

  // 1. Fetch recent transactions
  const txResult = await db.execute({
    sql: `
      SELECT merchant_name, description, amount, currency, date
      FROM ob_transactions
      WHERE household_id = ? AND date > ?
      ORDER BY date ASC
    `,
    args: [session.user.householdId, ninetyDaysAgo],
  })

  const rows = txResult.rows as unknown as OBTransactionRow[]

  // 2. Run recurring detection algorithm
  const detected = detectRecurringPayments(
    rows.map((r) => ({
      merchant_name: r.merchant_name ?? undefined,
      description: r.description,
      amount: r.amount,
      currency: r.currency,
      date: r.date,
    }))
  )

  if (detected.length === 0) {
    return NextResponse.json({ suggestions: [] })
  }

  // 3. Fetch existing renewal names to avoid duplicates
  const renewalsResult = await db.execute({
    sql: 'SELECT name FROM renewals WHERE household_id = ?',
    args: [session.user.householdId],
  })

  const existingKeys = new Set(
    renewalsResult.rows.map((r) => normaliseForComparison(r.name as string))
  )

  // 4. Filter out already-tracked renewals
  const suggestions = detected.filter(
    (d) => !existingKeys.has(normaliseForComparison(d.name))
  )

  return NextResponse.json({ suggestions })
}

/**
 * POST /api/connections/recurring
 *
 * Bulk-insert a set of detected recurring payment suggestions as renewals.
 *
 * Body: { suggestions: DetectedRecurring[] }
 *
 * Returns: { inserted: number }
 */
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: { suggestions: DetectedRecurring[] }
  try {
    body = (await req.json()) as { suggestions: DetectedRecurring[] }
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { suggestions } = body
  if (!Array.isArray(suggestions) || suggestions.length === 0) {
    return NextResponse.json({ inserted: 0 })
  }

  const now = new Date().toISOString()
  let inserted = 0

  for (const suggestion of suggestions) {
    try {
      const id = randomUUID()
      await db.execute({
        sql: `
          INSERT INTO renewals
            (id, user_id, household_id, name, category, amount, currency,
             renewal_date, auto_renews, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        args: [
          id,
          session.user.id,
          session.user.householdId,
          suggestion.name,
          'subscription',
          suggestion.amount,
          suggestion.currency,
          suggestion.next_renewal_date,
          1, // auto_renews = true for detected subscriptions
          now,
        ],
      })
      inserted++
    } catch (err) {
      // Log but continue so one failure doesn't block the rest
      console.error('recurring POST: failed to insert suggestion', suggestion.name, err)
    }
  }

  return NextResponse.json({ inserted }, { status: 201 })
}
