import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { Topbar } from '@/components/layout/topbar'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { SpendingBreakdown } from '@/components/dashboard/spending-breakdown'
import { MonthlyCashflow } from '@/components/dashboard/monthly-cashflow'
import { CATEGORY_META, CATEGORY_ORDER, categorizeTransaction, type SpendingCategory } from '@/lib/categorize'
import { formatCurrency } from '@/lib/utils'
import { TrendingDown, TrendingUp, Wallet, PiggyBank, CreditCard, BarChart3 } from 'lucide-react'
import Link from 'next/link'

export default async function SpendingPage() {
  const session = await auth()
  const hid = session!.user.householdId

  // ── Date window: last 12 months ──────────────────────────────────────────
  const cutoff = new Date()
  cutoff.setMonth(cutoff.getMonth() - 12)
  const cutoffStr = cutoff.toISOString().slice(0, 10)

  const now = new Date()
  const thisMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

  // ── Fetch transactions ────────────────────────────────────────────────────
  const txRes = await db.execute({
    sql: `SELECT t.id, t.account_id, t.merchant_name, t.description,
                 t.amount, t.currency, t.date, t.category,
                 a.account_type, a.account_name, c.bank_name
          FROM ob_transactions t
          LEFT JOIN open_banking_accounts a ON t.account_id = a.id
          LEFT JOIN open_banking_connections c ON a.connection_id = c.id
          WHERE t.household_id = ? AND t.date >= ?
          ORDER BY t.date DESC
          LIMIT 5000`,
    args: [hid, cutoffStr],
  })

  type TxRow = {
    id: string; account_id: string; merchant_name: string | null
    description: string; amount: number; currency: string; date: string
    category: string | null; account_type: string | null; account_name: string | null; bank_name: string | null
  }

  const rawTxs = txRes.rows as unknown as TxRow[]

  // ── Categorise (use stored category if present, else recalculate) ─────────
  const txs = rawTxs.map(t => ({
    ...t,
    cat: ((t.category as SpendingCategory | null) ?? categorizeTransaction(t.description, t.merchant_name)) as SpendingCategory,
  }))

  // ── This-month summary ────────────────────────────────────────────────────
  const thisMonth = txs.filter(t => t.date.startsWith(thisMonthStr))
  const totalIncome = thisMonth.filter(t => t.cat === 'income' && t.amount > 0)
    .reduce((s, t) => s + t.amount, 0)
  const totalExpenses = thisMonth.filter(t => CATEGORY_META[t.cat]?.isExpense && t.amount < 0)
    .reduce((s, t) => s + Math.abs(Number(t.amount)), 0)
  const netSavings = totalIncome - totalExpenses

  // ── Category breakdown (all 12 months, expenses only) ────────────────────
  const catMap = new Map<SpendingCategory, { amount: number; count: number }>()
  for (const t of txs) {
    if (!CATEGORY_META[t.cat]?.isExpense || Number(t.amount) >= 0) continue
    const prev = catMap.get(t.cat) ?? { amount: 0, count: 0 }
    catMap.set(t.cat, { amount: prev.amount + Math.abs(Number(t.amount)), count: prev.count + 1 })
  }
  const totalSpend12m = Array.from(catMap.values()).reduce((s, v) => s + v.amount, 0)

  const categories = CATEGORY_ORDER
    .filter(c => catMap.has(c) && CATEGORY_META[c].isExpense)
    .map(c => {
      const v = catMap.get(c)!
      const meta = CATEGORY_META[c]
      return {
        category: c, label: meta.label, icon: meta.icon, color: meta.color,
        amount: Math.round(v.amount * 100) / 100,
        count: v.count,
        pct: totalSpend12m > 0 ? Math.round((v.amount / totalSpend12m) * 100) : 0,
      }
    })
    .sort((a, b) => b.amount - a.amount)

  // ── Monthly cash-flow ─────────────────────────────────────────────────────
  const monthlyMap = new Map<string, { income: number; expenses: number }>()
  for (const t of txs) {
    const ym = t.date.slice(0, 7)
    const prev = monthlyMap.get(ym) ?? { income: 0, expenses: 0 }
    if (t.cat === 'income' && Number(t.amount) > 0) {
      monthlyMap.set(ym, { ...prev, income: prev.income + Number(t.amount) })
    } else if (CATEGORY_META[t.cat]?.isExpense && Number(t.amount) < 0) {
      monthlyMap.set(ym, { ...prev, expenses: prev.expenses + Math.abs(Number(t.amount)) })
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

  // ── Account balances ──────────────────────────────────────────────────────
  const accsRes = await db.execute({
    sql: `SELECT a.id, a.account_name, a.account_type, a.balance, a.currency, c.bank_name
          FROM open_banking_accounts a
          JOIN open_banking_connections c ON a.connection_id = c.id
          WHERE a.household_id = ? AND c.status = 'active'
          ORDER BY a.account_type, a.balance DESC`,
    args: [hid],
  })

  type AccRow = { id: string; account_name: string; account_type: string; balance: number; currency: string; bank_name: string }
  const accounts = (accsRes.rows as unknown as AccRow[])
  const assets = accounts.filter(a => a.account_type !== 'CREDIT_CARD')
  const liabilities = accounts.filter(a => a.account_type === 'CREDIT_CARD')

  // ── Recent transactions (last 20) ─────────────────────────────────────────
  const recent = txs.slice(0, 20)

  // ── Empty state ───────────────────────────────────────────────────────────
  const noData = txs.length === 0

  return (
    <div>
      <Topbar title="Spending Analytics" subtitle="12-month view of your household finances" userName={session?.user?.name ?? ''} />
      <div className="p-4 md:p-8 space-y-6 animate-fade-in">

        {noData && (
          <Card className="border-indigo-200 bg-indigo-50">
            <CardContent className="py-6 text-center space-y-2">
              <BarChart3 className="mx-auto text-indigo-400" size={32} />
              <p className="font-semibold text-indigo-800">No transaction data yet</p>
              <p className="text-sm text-indigo-600">Connect a bank account to see your spending breakdown.</p>
              <Link href="/connections">
                <button className="mt-2 text-sm font-semibold text-indigo-600 bg-white border border-indigo-200 px-4 py-2 rounded-xl hover:bg-indigo-50 transition-all">
                  Connect a bank →
                </button>
              </Link>
            </CardContent>
          </Card>
        )}

        {/* ── This-month summary cards ─────────────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-5 pb-4">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center">
                  <TrendingUp size={15} className="text-emerald-600" />
                </div>
                <p className="text-xs text-slate-500 font-medium">Income this month</p>
              </div>
              <p className="text-xl font-bold text-slate-800">{formatCurrency(totalIncome, 'GBP')}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-5 pb-4">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-8 h-8 rounded-lg bg-rose-50 flex items-center justify-center">
                  <TrendingDown size={15} className="text-rose-500" />
                </div>
                <p className="text-xs text-slate-500 font-medium">Spent this month</p>
              </div>
              <p className="text-xl font-bold text-slate-800">{formatCurrency(totalExpenses, 'GBP')}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-5 pb-4">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center">
                  <PiggyBank size={15} className="text-indigo-500" />
                </div>
                <p className="text-xs text-slate-500 font-medium">Net saved this month</p>
              </div>
              <p className={`text-xl font-bold ${netSavings >= 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
                {formatCurrency(netSavings, 'GBP')}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-5 pb-4">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center">
                  <Wallet size={15} className="text-amber-600" />
                </div>
                <p className="text-xs text-slate-500 font-medium">12-month spend</p>
              </div>
              <p className="text-xl font-bold text-slate-800">{formatCurrency(totalSpend12m, 'GBP')}</p>
            </CardContent>
          </Card>
        </div>

        {/* ── Charts ──────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader><CardTitle>Spending by Category</CardTitle></CardHeader>
            <CardContent><SpendingBreakdown categories={categories} currency="GBP" /></CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Monthly Cash Flow</CardTitle></CardHeader>
            <CardContent><MonthlyCashflow data={monthly} currency="GBP" /></CardContent>
          </Card>
        </div>

        {/* ── Category breakdown list ───────────────────────────────────── */}
        <Card>
          <CardHeader><CardTitle>Category Breakdown — Last 12 Months</CardTitle></CardHeader>
          <CardContent>
            {categories.length === 0 ? (
              <p className="text-sm text-slate-400 py-4 text-center">No spending data</p>
            ) : (
              <div className="space-y-3">
                {categories.map(c => (
                  <div key={c.category} className="flex items-center gap-3">
                    <span className="text-lg w-7 text-center shrink-0">{c.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-slate-700">{c.label}</span>
                        <span className="text-sm font-semibold text-slate-800 ml-2 shrink-0">{formatCurrency(c.amount, 'GBP')}</span>
                      </div>
                      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{ width: `${c.pct}%`, backgroundColor: c.color }}
                        />
                      </div>
                    </div>
                    <span className="text-xs text-slate-400 w-8 text-right shrink-0">{c.pct}%</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* ── Account summary (assets vs liabilities) ─────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Bank Accounts (Assets)</CardTitle>
              <Link href="/assets" className="text-xs text-indigo-500 hover:text-indigo-600 font-medium">View all</Link>
            </CardHeader>
            <CardContent>
              {assets.length === 0 ? (
                <p className="text-sm text-slate-400 py-4 text-center">No linked accounts</p>
              ) : (
                <div className="space-y-3">
                  {assets.map(a => (
                    <div key={a.id} className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-slate-700">{a.account_name}</p>
                        <p className="text-xs text-slate-400">{a.bank_name} · {a.account_type === 'SAVINGS' ? 'Savings' : 'Current'}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-emerald-700">{formatCurrency(Number(a.balance), a.currency)}</p>
                        <Badge variant="default" className="text-xs">Asset</Badge>
                      </div>
                    </div>
                  ))}
                  <div className="pt-2 border-t border-slate-100 flex justify-between">
                    <span className="text-sm font-semibold text-slate-600">Total</span>
                    <span className="text-sm font-bold text-emerald-700">
                      {formatCurrency(assets.reduce((s, a) => s + Number(a.balance), 0), 'GBP')}
                    </span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Credit Cards (Liabilities)</CardTitle>
              <Link href="/liabilities" className="text-xs text-indigo-500 hover:text-indigo-600 font-medium">View all</Link>
            </CardHeader>
            <CardContent>
              {liabilities.length === 0 ? (
                <p className="text-sm text-slate-400 py-4 text-center">No linked credit cards</p>
              ) : (
                <div className="space-y-3">
                  {liabilities.map(a => (
                    <div key={a.id} className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-slate-700">{a.account_name}</p>
                        <p className="text-xs text-slate-400">{a.bank_name} · Credit Card</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-rose-600">{formatCurrency(Number(a.balance), a.currency)}</p>
                        <Badge variant="danger" className="text-xs">Liability</Badge>
                      </div>
                    </div>
                  ))}
                  <div className="pt-2 border-t border-slate-100 flex justify-between">
                    <span className="text-sm font-semibold text-slate-600">Total owed</span>
                    <span className="text-sm font-bold text-rose-600">
                      {formatCurrency(liabilities.reduce((s, a) => s + Number(a.balance), 0), 'GBP')}
                    </span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* ── Recent transactions ──────────────────────────────────────── */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Recent Transactions</CardTitle>
            <span className="text-xs text-slate-400">{txs.length} total in 12 months</span>
          </CardHeader>
          <CardContent>
            {recent.length === 0 ? (
              <p className="text-sm text-slate-400 py-4 text-center">No transactions</p>
            ) : (
              <div className="space-y-2">
                {recent.map(t => {
                  const meta = CATEGORY_META[t.cat] ?? CATEGORY_META.other
                  const amt = Number(t.amount)
                  return (
                    <div key={t.id} className="flex items-center gap-3 py-1.5">
                      <span className="text-base w-7 text-center shrink-0">{meta.icon}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-700 truncate">
                          {t.merchant_name ?? t.description}
                        </p>
                        <p className="text-xs text-slate-400">{t.date} · {t.account_name ?? 'Unknown account'}</p>
                      </div>
                      <p className={`text-sm font-semibold shrink-0 ${amt < 0 ? 'text-rose-600' : 'text-emerald-700'}`}>
                        {amt < 0 ? '-' : '+'}{formatCurrency(Math.abs(amt), t.currency)}
                      </p>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>

      </div>
    </div>
  )
}
