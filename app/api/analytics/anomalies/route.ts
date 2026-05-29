import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'

interface Anomaly {
  type: 'new_merchant' | 'price_increase' | 'duplicate_charge' | 'subscription_detected'
  title: string
  description: string
  amount: number
  currency: string
  date: string
  merchant: string
  severity: 'info' | 'warning' | 'alert'
}

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const hid = session.user.householdId

  // Last 90 days of transactions
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - 90)
  const cutoffStr = cutoff.toISOString().slice(0, 10)

  // Previous 90-day window for comparisons
  const prevCutoff = new Date()
  prevCutoff.setDate(prevCutoff.getDate() - 180)
  const prevCutoffStr = prevCutoff.toISOString().slice(0, 10)

  const [recentRes, prevRes] = await Promise.all([
    db.execute({
      sql: `SELECT merchant_name, description, amount, currency, date
            FROM ob_transactions
            WHERE household_id = ? AND date >= ? AND amount < 0
            ORDER BY date DESC`,
      args: [hid, cutoffStr],
    }),
    db.execute({
      sql: `SELECT merchant_name, description, amount, currency, date
            FROM ob_transactions
            WHERE household_id = ? AND date >= ? AND date < ? AND amount < 0
            ORDER BY date DESC`,
      args: [hid, prevCutoffStr, cutoffStr],
    }),
  ])

  type TxRow = { merchant_name: string | null; description: string; amount: number; currency: string; date: string }
  const recent = recentRes.rows as unknown as TxRow[]
  const prev = prevRes.rows as unknown as TxRow[]

  const anomalies: Anomaly[] = []

  // ── 1. New merchants (appear in last 30 days, never seen before) ──────────
  const recentMerchants = new Set(recent.map(t => (t.merchant_name || t.description).toLowerCase().trim()))
  const prevMerchants = new Set(prev.map(t => (t.merchant_name || t.description).toLowerCase().trim()))
  const last30Cutoff = new Date()
  last30Cutoff.setDate(last30Cutoff.getDate() - 30)
  const last30Str = last30Cutoff.toISOString().slice(0, 10)

  const last30 = recent.filter(t => t.date >= last30Str)
  const seenNewMerchants = new Set<string>()
  for (const t of last30) {
    const key = (t.merchant_name || t.description).toLowerCase().trim()
    if (!prevMerchants.has(key) && !seenNewMerchants.has(key)) {
      seenNewMerchants.add(key)
      anomalies.push({
        type: 'new_merchant',
        title: 'New merchant',
        description: `First transaction with "${t.merchant_name || t.description}" — make sure you authorised this.`,
        amount: Math.abs(Number(t.amount)),
        currency: t.currency,
        date: t.date,
        merchant: t.merchant_name || t.description,
        severity: 'info',
      })
    }
  }

  // ── 2. Subscription detector (regular monthly charges) ────────────────────
  const merchantMonths = new Map<string, { dates: string[]; amounts: number[] }>()
  for (const t of recent) {
    const key = (t.merchant_name || t.description).toLowerCase().trim()
    const existing = merchantMonths.get(key) ?? { dates: [], amounts: [] }
    existing.dates.push(t.date)
    existing.amounts.push(Math.abs(Number(t.amount)))
    merchantMonths.set(key, existing)
  }

  for (const [merchant, data] of merchantMonths.entries()) {
    if (data.dates.length >= 2) {
      const uniqueMonths = new Set(data.dates.map(d => d.slice(0, 7)))
      if (uniqueMonths.size >= 2) {
        const avgAmount = data.amounts.reduce((s, a) => s + a, 0) / data.amounts.length
        // Check for price increase vs prev period
        const prevTxs = prev.filter(t => (t.merchant_name || t.description).toLowerCase().trim() === merchant)
        if (prevTxs.length >= 2) {
          const prevAvg = prevTxs.reduce((s, t) => s + Math.abs(Number(t.amount)), 0) / prevTxs.length
          const increase = avgAmount - prevAvg
          const pct = prevAvg > 0 ? (increase / prevAvg) * 100 : 0
          if (pct > 10 && increase > 1) {
            anomalies.push({
              type: 'price_increase',
              title: 'Subscription price increase',
              description: `${merchant} has increased by ${pct.toFixed(0)}% (from £${prevAvg.toFixed(2)} to £${avgAmount.toFixed(2)}/mo). Consider reviewing or cancelling.`,
              amount: avgAmount,
              currency: data.dates[0] ? recent.find(t => t.date === data.dates[0])?.currency ?? 'GBP' : 'GBP',
              date: data.dates[0],
              merchant,
              severity: 'warning',
            })
          }
        } else {
          // New detected subscription
          anomalies.push({
            type: 'subscription_detected',
            title: 'Recurring subscription detected',
            description: `"${merchant}" charges ~£${avgAmount.toFixed(2)} monthly. Ensure this is still needed.`,
            amount: avgAmount,
            currency: 'GBP',
            date: data.dates[data.dates.length - 1],
            merchant,
            severity: 'info',
          })
        }
      }
    }
  }

  // ── 3. Duplicate charges (same merchant, same amount, same day) ───────────
  const seen = new Map<string, boolean>()
  for (const t of recent) {
    const key = `${(t.merchant_name || t.description).toLowerCase().trim()}_${Math.abs(Number(t.amount)).toFixed(2)}_${t.date}`
    if (seen.has(key)) {
      anomalies.push({
        type: 'duplicate_charge',
        title: 'Possible duplicate charge',
        description: `"${t.merchant_name || t.description}" was charged £${Math.abs(Number(t.amount)).toFixed(2)} twice on ${t.date}. Check your statements.`,
        amount: Math.abs(Number(t.amount)),
        currency: t.currency,
        date: t.date,
        merchant: t.merchant_name || t.description,
        severity: 'alert',
      })
    }
    seen.set(key, true)
  }

  // Sort: alerts first, then warnings, then info
  const severityOrder = { alert: 0, warning: 1, info: 2 }
  anomalies.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity])

  return NextResponse.json({ anomalies: anomalies.slice(0, 20) })
}
