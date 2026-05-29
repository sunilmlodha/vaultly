import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { Topbar } from '@/components/layout/topbar'
import { StatCard } from '@/components/dashboard/stat-card'
import { NetWorthChart } from '@/components/dashboard/net-worth-chart'
import { AssetBreakdown } from '@/components/dashboard/asset-breakdown'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Wallet, CreditCard, TrendingUp, RefreshCw } from 'lucide-react'
import { formatCurrency, formatDate, getDaysUntil } from '@/lib/utils'
import Link from 'next/link'
import type { Asset, Liability, Renewal, Goal } from '@/lib/types'

export default async function DashboardPage() {
  const session = await auth()
  const hid = session!.user.householdId

  const [assetsRes, liabRes, renewalsRes, goalsRes] = await Promise.all([
    db.execute({ sql: 'SELECT * FROM assets WHERE household_id = ?', args: [hid] }),
    db.execute({ sql: 'SELECT * FROM liabilities WHERE household_id = ?', args: [hid] }),
    db.execute({ sql: 'SELECT * FROM renewals WHERE household_id = ? ORDER BY renewal_date', args: [hid] }),
    db.execute({ sql: 'SELECT * FROM goals WHERE household_id = ?', args: [hid] }),
  ])

  const assets = assetsRes.rows as unknown as Asset[]
  const liabilities = liabRes.rows as unknown as Liability[]
  const renewals = renewalsRes.rows as unknown as Renewal[]
  const goals = goalsRes.rows as unknown as Goal[]

  const totalAssets = assets.reduce((s, a) => s + Number(a.value), 0)
  const totalLiabilities = liabilities.reduce((s, l) => s + Number(l.balance), 0)
  const netWorth = totalAssets - totalLiabilities
  const upcomingRenewals = renewals.filter(r => {
    const d = getDaysUntil(r.renewal_date)
    return d >= 0 && d <= 30
  })

  return (
    <div>
      <Topbar
        title={`Good to see you${session?.user?.name ? `, ${session.user.name.split(' ')[0]}` : ''}!`}
        subtitle="Your financial overview"
        userName={session?.user?.name ?? ''}
      />
      <div className="p-4 md:p-8 space-y-6 animate-fade-in">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard title="Net Worth" value={netWorth} icon={TrendingUp} color="indigo" />
          <StatCard title="Total Assets" value={totalAssets} icon={Wallet} color="emerald" subtitle={`${assets.length} items`} />
          <StatCard title="Liabilities" value={totalLiabilities} icon={CreditCard} color="rose" subtitle={`${liabilities.length} items`} />
          <StatCard title="Due Renewals" value={upcomingRenewals.reduce((s, r) => s + Number(r.amount), 0)} icon={RefreshCw} color="amber" subtitle={`${upcomingRenewals.length} in 30 days`} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2">
            <CardHeader><CardTitle>Net Worth Trend</CardTitle></CardHeader>
            <CardContent><NetWorthChart netWorth={netWorth} /></CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Asset Breakdown</CardTitle></CardHeader>
            <CardContent><AssetBreakdown assets={assets} /></CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Upcoming Renewals</CardTitle>
              <Link href="/dashboard/renewals" className="text-xs text-indigo-500 hover:text-indigo-600 font-medium">View all</Link>
            </CardHeader>
            <CardContent>
              {upcomingRenewals.length === 0 ? (
                <p className="text-sm text-slate-400 py-4 text-center">No renewals due in 30 days</p>
              ) : (
                <div className="space-y-3">
                  {upcomingRenewals.slice(0, 4).map(r => {
                    const days = getDaysUntil(r.renewal_date)
                    return (
                      <div key={r.id} className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-slate-700">{r.name}</p>
                          <p className="text-xs text-slate-400">{formatDate(r.renewal_date)}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-semibold text-slate-800">{formatCurrency(Number(r.amount), r.currency)}</p>
                          <Badge variant={days <= 7 ? 'danger' : days <= 14 ? 'warning' : 'default'}>
                            {days === 0 ? 'Today' : `${days}d`}
                          </Badge>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Goals</CardTitle>
              <Link href="/dashboard/goals" className="text-xs text-indigo-500 hover:text-indigo-600 font-medium">View all</Link>
            </CardHeader>
            <CardContent>
              {goals.length === 0 ? (
                <p className="text-sm text-slate-400 py-4 text-center">No goals set yet</p>
              ) : (
                <div className="space-y-4">
                  {goals.slice(0, 3).map(g => {
                    const pct = Math.min(100, Math.round((Number(g.current_amount) / Number(g.target_amount)) * 100))
                    return (
                      <div key={g.id}>
                        <div className="flex justify-between text-sm mb-1.5">
                          <span className="font-medium text-slate-700">{g.name}</span>
                          <span className="text-slate-500">{pct}%</span>
                        </div>
                        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div className="h-full bg-indigo-400 rounded-full transition-all" style={{ width: `${pct}%` }} />
                        </div>
                        <div className="flex justify-between text-xs text-slate-400 mt-1">
                          <span>{formatCurrency(Number(g.current_amount), g.currency)}</span>
                          <span>{formatCurrency(Number(g.target_amount), g.currency)}</span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
