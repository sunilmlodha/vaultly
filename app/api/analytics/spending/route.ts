import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { CATEGORY_META, CATEGORY_ORDER, type SpendingCategory } from '@/lib/categorize'

/**
 * GET /api/analytics/spending?months=12&account=all
 *
 * Returns aggregated spending by category and monthly cash-flow trends.
 * Reads from ob_transactions which is populated by TrueLayer sync or the
 * seed-demo script. Categories are either stored at insert time (seed data)
 * or recalculated from description if NULL.
 */

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const hid = session.user.householdId
  const url = new URL(req.url)
  const months = Math.min(parseInt(url.searchParams.get('months') ?? '12'), 24)
  const accountFilter = url.searchParams.get('account') ?? 'all'

  // ── Date window ────────────────────────────────────────────────────────────
  const cutoff = new Date()
  cutoff.setMonth(cutoff.getMonth() - months)
  const cutoffStr = cutoff.toISOString().slice(0, 10)

  // ── Fetch transactions ─────────────────────────────────────────────────────
  let sql = 'SELECT t.*, a.account_type FROM ob_transactions t LEFT JOIN open_banking_accounts a ON t.account_id = a.id WHERE t.household_id = ? AND t.date >= ?'
  const args: (string | number)[] = [hid, cutoffStr]

  if (accountFilter !== 'all') {
    sql += ' AND t.account_id = ?'
    args.push(accountFilter)
  }

  sql += ' ORDER BY t.date DESC LIMIT 5000'

  const res = await db.execute({ sql, args })

  type TxRow = {
    id: string
    account_id: string
    merchant_name: string | null
    description: string
    amount: number
    currency: string
    date: string
    category: string | null
    account_type: string | null
  }

  const txs = res.rows as unknown as TxRow[]

  // ── Categorise on-the-fly for any rows missing the category column ─────────
  const { categorizeTransaction } = await import('@/lib/categorize')

  const categorised = txs.map(t => ({
    ...t,
    cat: (t.category as SpendingCategory | null) ?? categorizeTransaction(t.description, t.merchant_name),
  }))

  // ── Summary for the most recent complete month ─────────────────────────────
  const now = new Date()
  const thisMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  const thisMonthTxs = categorised.filter(t => t.date.startsWith(thisMonthStr))

  const totalIncome = thisMonthTxs
    .filter(t => t.cat === 'income' && t.amount > 0)
    .reduce((s, t) => s + Math.abs(t.amount), 0)

  const totalExpenses = thisMonthTxs
    .filter(t => CATEGORY_META[t.cat]?.isExpense && t.amount < 0)
    .reduce((s, t) => s + Math.abs(t.amount), 0)

  // ── Category aggregation (all-time within window, expenses only) ──────────
  const catMap = new Map<SpendingCategory, { amount: number; count: number }>()

  for (const t of categorised) {
    if (!CATEGORY_META[t.cat]?.isExpense) continue
    if (t.amount >= 0) continue // credits / refunds ignored in breakdown
    const prev = catMap.get(t.cat) ?? { amount: 0, count: 0 }
    catMap.set(t.cat, { amount: prev.amount + Math.abs(t.amount), count: prev.count + 1 })
  }

  const totalSpend = Array.from(catMap.values()).reduce((s, v) => s + v.amount, 0)

  const categories = CATEGORY_ORDER
    .filter(c => catMap.has(c) && CATEGORY_META[c].isExpense)
    .map(c => {
      const v = catMap.get(c)!
      const meta = CATEGORY_META[c]
      return {
        category: c,
        label: meta.label,
        icon: meta.icon,
        color: meta.color,
        amount: Math.round(v.amount * 100) / 100,
        count: v.count,
        pct: totalSpend > 0 ? Math.round((v.amount / totalSpend) * 100) : 0,
      }
    })
    .sort((a, b) => b.amount - a.amount)

  // ── Monthly cash-flow (income vs expenses per month) ─────────────────────
  const monthlyMap = new Map<string, { income: number; expenses: number }>()

  for (const t of categorised) {
    const ym = t.date.slice(0, 7) // "2025-09"
    const prev = monthlyMap.get(ym) ?? { income: 0, expenses: 0 }
    if (t.cat === 'income' && t.amount > 0) {
      monthlyMap.set(ym, { ...prev, income: prev.income + t.amount })
    } else if (CATEGORY_META[t.cat]?.isExpense && t.amount < 0) {
      monthlyMap.set(ym, { ...prev, expenses: prev.expenses + Math.abs(t.amount) })
    }
  }

  const monthly = Array.from(monthlyMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([ym, v]) => ({
      month: ym,
      label: new Date(ym + '-01').toLocaleString('en-GB', { month: 'short', year: '2-digit' }),
      income: Math.round(v.income * 100) / 100,
      expenses: Math.round(v.expenses * 100) / 100,
      net: Math.round((v.income - v.expenses) * 100) / 100,
    }))

  // ── Top merchants ─────────────────────────────────────────────────────────
  const merchantMap = new Map<string, { amount: number; count: number }>()
  for (const t of categorised) {
    if (t.amount >= 0) continue
    const name = t.merchant_name ?? t.description.split(' ').slice(0, 3).join(' ')
    const prev = merchantMap.get(name) ?? { amount: 0, count: 0 }
    merchantMap.set(name, { amount: prev.amount + Math.abs(t.amount), count: prev.count + 1 })
  }

  const topMerchants = Array.from(merchantMap.entries())
    .sort(([, a], [, b]) => b.amount - a.amount)
    .slice(0, 10)
    .map(([name, v]) => ({ name, amount: Math.round(v.amount * 100) / 100, count: v.count }))

  // ── Accounts summary ──────────────────────────────────────────────────────
  const accsRes = await db.execute({
    sql: `SELECT a.id, a.account_name, a.account_type, a.balance, a.currency,
               c.bank_name
          FROM open_banking_accounts a
          JOIN open_banking_connections c ON a.connection_id = c.id
          WHERE a.household_id = ? AND c.status = 'active'`,
    args: [hid],
  })

  type AccRow = { id: string; account_name: string; account_type: string; balance: number; currency: string; bank_name: string }
  const accounts = (accsRes.rows as unknown as AccRow[]).map(a => ({
    id: a.id,
    name: a.account_name,
    type: a.account_type,
    balance: Number(a.balance),
    currency: a.currency,
    bank: a.bank_name,
    side: a.account_type === 'CREDIT_CARD' ? 'liability' : 'asset',
  }))

  const totalAssets = accounts.filter(a => a.side === 'asset').reduce((s, a) => s + a.balance, 0)
  const totalLiabilities = accounts.filter(a => a.side === 'liability').reduce((s, a) => s + a.balance, 0)

  return NextResponse.json({
    summary: {
      month: thisMonthStr,
      totalIncome: Math.round(totalIncome * 100) / 100,
      totalExpenses: Math.round(totalExpenses * 100) / 100,
      netSavings: Math.round((totalIncome - totalExpenses) * 100) / 100,
      totalAssets: Math.round(totalAssets * 100) / 100,
      totalLiabilities: Math.round(totalLiabilities * 100) / 100,
      netWorth: Math.round((totalAssets - totalLiabilities) * 100) / 100,
    },
    categories,
    monthly,
    topMerchants,
    accounts,
    txCount: txs.length,
    windowMonths: months,
  })
}
