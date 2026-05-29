'use client'
import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { Topbar } from '@/components/layout/topbar'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { formatCurrency } from '@/lib/utils'
import { TrendingUp, TrendingDown, AlertTriangle, Sparkles, RefreshCw, PiggyBank, Calendar } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from 'recharts'
import type { ForecastResult, ForecastMonth } from '@/lib/claude/forecast-agent'
import Link from 'next/link'

export default function ForecastPage() {
  const { data: session } = useSession()
  const [forecast, setForecast] = useState<ForecastResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/forecast')
      if (!res.ok) throw new Error('Failed to load forecast')
      const { forecast: data } = await res.json()
      setForecast(data)
    } catch {
      setError('Could not generate forecast. Make sure you have connected bank accounts.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const chartData = forecast?.months.map(m => ({
    name: m.label,
    income: m.projected_income,
    expenses: m.projected_expenses,
    net: m.projected_net,
    isRisk: m.is_risk_month,
  })) ?? []

  return (
    <div>
      <Topbar
        title="Cashflow Forecast"
        subtitle="6-month AI-powered projection"
        userName={session?.user?.name ?? ''}
        actions={
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
          </Button>
        }
      />
      <div className="p-4 md:p-8 space-y-6 animate-fade-in">

        {loading && (
          <Card>
            <CardContent className="py-16 text-center">
              <div className="w-10 h-10 rounded-full border-2 border-indigo-400 border-t-transparent animate-spin mx-auto mb-4" />
              <p className="text-slate-500 font-medium">Generating your AI cashflow forecast…</p>
              <p className="text-slate-400 text-sm mt-1">Analysing spending patterns and upcoming renewals</p>
            </CardContent>
          </Card>
        )}

        {error && !loading && (
          <Card className="border-amber-200 bg-amber-50">
            <CardContent className="py-8 text-center space-y-3">
              <AlertTriangle size={28} className="text-amber-500 mx-auto" />
              <p className="font-medium text-amber-800">{error}</p>
              <div className="flex gap-3 justify-center">
                <Button size="sm" onClick={load}>Try again</Button>
                <Link href="/connections">
                  <Button variant="outline" size="sm">Connect a bank</Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        )}

        {forecast && !loading && (
          <>
            {/* ── AI Narrative ────────────────────────────────────────────── */}
            <Card className="border-indigo-200 bg-gradient-to-br from-indigo-50 to-purple-50">
              <CardContent className="py-5">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl bg-indigo-100 flex items-center justify-center shrink-0 mt-0.5">
                    <Sparkles size={16} className="text-indigo-500" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-indigo-800 mb-1">AI Forecast Summary</p>
                    <p className="text-sm text-indigo-700 leading-relaxed">{forecast.narrative}</p>
                    <div className="mt-3 p-3 bg-white/70 rounded-xl border border-indigo-100">
                      <p className="text-xs font-semibold text-indigo-600 mb-0.5">Top tip</p>
                      <p className="text-xs text-indigo-700">{forecast.top_tip}</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* ── Summary stats ────────────────────────────────────────────── */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardContent className="pt-5 pb-4">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center">
                      <PiggyBank size={15} className="text-emerald-600" />
                    </div>
                    <p className="text-xs text-slate-500 font-medium">Avg monthly surplus</p>
                  </div>
                  <p className={`text-xl font-bold ${forecast.avg_monthly_surplus >= 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
                    {forecast.avg_monthly_surplus >= 0 ? '+' : ''}{formatCurrency(forecast.avg_monthly_surplus)}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-5 pb-4">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center">
                      <Calendar size={15} className="text-amber-600" />
                    </div>
                    <p className="text-xs text-slate-500 font-medium">Renewals upcoming</p>
                  </div>
                  <p className="text-xl font-bold text-slate-800">{formatCurrency(forecast.total_renewals_cost)}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-5 pb-4">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-8 h-8 rounded-lg bg-rose-50 flex items-center justify-center">
                      <AlertTriangle size={15} className="text-rose-500" />
                    </div>
                    <p className="text-xs text-slate-500 font-medium">Risk months</p>
                  </div>
                  <p className={`text-xl font-bold ${forecast.risk_months_count > 0 ? 'text-rose-600' : 'text-emerald-700'}`}>
                    {forecast.risk_months_count} / 6
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-5 pb-4">
                  <div className="flex items-center gap-2 mb-1">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${forecast.avg_monthly_surplus >= 0 ? 'bg-emerald-50' : 'bg-rose-50'}`}>
                      {forecast.avg_monthly_surplus >= 0
                        ? <TrendingUp size={15} className="text-emerald-600" />
                        : <TrendingDown size={15} className="text-rose-500" />}
                    </div>
                    <p className="text-xs text-slate-500 font-medium">Trend</p>
                  </div>
                  <p className={`text-xl font-bold ${forecast.avg_monthly_surplus >= 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
                    {forecast.avg_monthly_surplus >= 0 ? 'Positive' : 'Deficit'}
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* ── Chart ────────────────────────────────────────────────────── */}
            <Card>
              <CardHeader>
                <CardTitle>6-Month Projected Cash Flow</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={chartData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false}
                      tickFormatter={v => `£${Math.abs(v) >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`} />
                    <Tooltip
                      formatter={(value, name) => [formatCurrency(Number(value ?? 0)), name === 'income' ? 'Income' : name === 'expenses' ? 'Expenses' : 'Net']}
                      contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    />
                    <Bar dataKey="income" fill="#6366f1" radius={[4, 4, 0, 0]} opacity={0.7} />
                    <Bar dataKey="expenses" fill="#f43f5e" radius={[4, 4, 0, 0]} opacity={0.7} />
                    <Bar dataKey="net" radius={[4, 4, 0, 0]}>
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.net >= 0 ? '#10b981' : '#ef4444'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
                <div className="flex items-center gap-6 mt-3 justify-center">
                  <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-sm bg-indigo-500 opacity-70" /><span className="text-xs text-slate-500">Income</span></div>
                  <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-sm bg-rose-500 opacity-70" /><span className="text-xs text-slate-500">Expenses</span></div>
                  <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-sm bg-emerald-500" /><span className="text-xs text-slate-500">Net</span></div>
                </div>
              </CardContent>
            </Card>

            {/* ── Month-by-month breakdown ──────────────────────────────────── */}
            <Card>
              <CardHeader><CardTitle>Month-by-Month Breakdown</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {forecast.months.map((m: ForecastMonth) => (
                    <div
                      key={m.month}
                      className={`flex items-center justify-between p-3 rounded-xl border transition-colors ${
                        m.is_risk_month
                          ? 'border-rose-200 bg-rose-50'
                          : 'border-slate-100 bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        {m.is_risk_month && <AlertTriangle size={14} className="text-rose-500 shrink-0" />}
                        <div>
                          <p className="text-sm font-semibold text-slate-800">{m.label}</p>
                          {m.risk_reason && <p className="text-xs text-rose-600">{m.risk_reason}</p>}
                          {m.renewals_due > 0 && <p className="text-xs text-amber-600">Renewals: {formatCurrency(m.renewals_due)}</p>}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className={`text-sm font-bold ${m.projected_net >= 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
                          {m.projected_net >= 0 ? '+' : ''}{formatCurrency(m.projected_net)}
                        </p>
                        <p className="text-xs text-slate-400">
                          {formatCurrency(m.projected_income)} in · {formatCurrency(m.projected_expenses)} out
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <p className="text-xs text-slate-400 text-center">
              Projections based on your last 3 months of spending + upcoming renewals. Not financial advice.
            </p>
          </>
        )}
      </div>
    </div>
  )
}
