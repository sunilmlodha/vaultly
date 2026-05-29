import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { generateCashflowForecast } from '@/lib/claude/forecast-agent'

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const hid = session.user.householdId

  // Last 6 months of actual monthly cashflow
  const cutoff = new Date()
  cutoff.setMonth(cutoff.getMonth() - 6)
  const cutoffStr = cutoff.toISOString().slice(0, 10)

  const [txRes, renewalRes] = await Promise.all([
    db.execute({
      sql: `SELECT t.amount, t.date, t.category
            FROM ob_transactions t
            WHERE t.household_id = ? AND t.date >= ?
            ORDER BY t.date DESC`,
      args: [hid, cutoffStr],
    }),
    db.execute({
      sql: `SELECT name, amount, renewal_date, category
            FROM renewals
            WHERE household_id = ? AND renewal_date >= date('now')
            ORDER BY renewal_date ASC`,
      args: [hid],
    }),
  ])

  type TxRow = { amount: number; date: string; category: string | null }
  const txs = txRes.rows as unknown as TxRow[]

  // Build monthly income/expense map from actual transactions
  const monthMap = new Map<string, { income: number; expenses: number }>()
  for (const t of txs) {
    const ym = t.date.slice(0, 7)
    const prev = monthMap.get(ym) ?? { income: 0, expenses: 0 }
    const amt = Number(t.amount)
    if (amt > 0 && t.category === 'income') {
      monthMap.set(ym, { ...prev, income: prev.income + amt })
    } else if (amt < 0 && t.category !== 'financial') {
      monthMap.set(ym, { ...prev, expenses: prev.expenses + Math.abs(amt) })
    }
  }
  const historicalMonthly = Array.from(monthMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, v]) => ({ month, ...v }))

  type RenewalRow = { name: string; amount: number; renewal_date: string; category: string }
  const upcomingRenewals = renewalRes.rows as unknown as RenewalRow[]

  const forecast = await generateCashflowForecast(historicalMonthly, upcomingRenewals)
  return NextResponse.json({ forecast })
}
