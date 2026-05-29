import { createClient } from '@/lib/supabase/server'
import { Topbar } from '@/components/layout/topbar'
import { StatCard } from '@/components/dashboard/stat-card'
import { NetWorthChart } from '@/components/dashboard/net-worth-chart'
import { AssetBreakdown } from '@/components/dashboard/asset-breakdown'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Wallet, CreditCard, TrendingUp, RefreshCw } from 'lucide-react'
import { formatCurrency, formatDate, getDaysUntil } from '@/lib/utils'
import Link from 'next/link'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user!.id).single()
  const { data: assets = [] } = await supabase.from('assets').select('*').eq('household_id', profile?.household_id)
  const { data: liabilities = [] } = await supabase.from('liabilities').select('*').eq('household_id', profile?.household_id)
  const { data: renewals = [] } = await supabase.from('renewals').select('*').eq('household_id', profile?.household_id).order('renewal_date')
  const { data: goals = [] } = await supabase.from('goals').select('*').eq('household_id', profile?.household_id)

  const totalAssets = (assets || []).reduce((s: number, a: { value: number }) => s + a.value, 0)
  const totalLiabilities = (liabilities || []).reduce((s: number, l: { balance: number }) => s + l.balance, 0)
  const netWorth = totalAssets - totalLiabilities
  const upcomingRenewals = (renewals || []).filter((r: { renewal_date: string }) => getDaysUntil(r.renewal_date) <= 30 && getDaysUntil(r.renewal_date) >= 0)

  return (
    <div>
      <Topbar
        title={`Good to see you${profile?.full_name ? `, ${profile.full_name.split(' ')[0]}` : ''}!`}
        subtitle="Your financial overview"
        userName={profile?.full_name}
      />
      <div className="p-4 md:p-8 space-y-6 animate-fade-in">
        {/* Stat cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard title="Net Worth" value={netWorth} icon={TrendingUp} color="indigo" />
          <StatCard title="Total Assets" value={totalAssets} icon={Wallet} color="emerald" subtitle={`${(assets || []).length} items`} />
          <StatCard title="Liabilities" value={totalLiabilities} icon={CreditCard} color="rose" subtitle={`${(liabilities || []).length} items`} />
          <StatCard title="Due Renewals" value={upcomingRenewals.reduce((s: number, r: { amount: number }) => s + r.amount, 0)} icon={RefreshCw} color="amber" subtitle={`${upcomingRenewals.length} in 30 days`} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Net worth chart */}
          <Card className="lg:col-span-2">
            <CardHeader><CardTitle>Net Worth Trend</CardTitle></CardHeader>
            <CardContent><NetWorthChart netWorth={netWorth} /></CardContent>
          </Card>

          {/* Asset breakdown */}
          <Card>
            <CardHeader><CardTitle>Asset Breakdown</CardTitle></CardHeader>
            <CardContent><AssetBreakdown assets={assets || []} /></CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Upcoming renewals */}
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
                  {upcomingRenewals.slice(0, 4).map((r: { id: string; name: string; amount: number; currency: string; renewal_date: string }) => {
                    const days = getDaysUntil(r.renewal_date)
                    return (
                      <div key={r.id} className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-slate-700">{r.name}</p>
                          <p className="text-xs text-slate-400">{formatDate(r.renewal_date)}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-semibold text-slate-800">{formatCurrency(r.amount, r.currency)}</p>
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

          {/* Goals */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Goals</CardTitle>
              <Link href="/dashboard/goals" className="text-xs text-indigo-500 hover:text-indigo-600 font-medium">View all</Link>
            </CardHeader>
            <CardContent>
              {(goals || []).length === 0 ? (
                <p className="text-sm text-slate-400 py-4 text-center">No goals set yet</p>
              ) : (
                <div className="space-y-4">
                  {(goals as Array<{ id: string; name: string; current_amount: number; target_amount: number; currency: string }>).slice(0, 3).map((g) => {
                    const pct = Math.min(100, Math.round((g.current_amount / g.target_amount) * 100))
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
                          <span>{formatCurrency(g.current_amount, g.currency)}</span>
                          <span>{formatCurrency(g.target_amount, g.currency)}</span>
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
