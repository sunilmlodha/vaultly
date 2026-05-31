'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Topbar } from '@/components/layout/topbar'
import {
  Users, TrendingUp, AlertTriangle, Calendar, Landmark, LineChart,
  ClipboardCopy, Download, Settings,
} from 'lucide-react'

/* ── Types ─────────────────────────────────────────────────── */
interface Org {
  id: string
  name: string
  role?: string
}

interface StressTrendPoint {
  week: string          // e.g. "2025-W12"
  avg_stress: number
}

interface OrgMetrics {
  tooSmall: boolean
  employeeCount: number
  avgVaultScore: number
  stressLabel: string
  latestStressAvg: number
  checkInRate: number   // 0-100 percentage
  pctWithPension: number
  pctWithInvestments: number
  stressTrend: StressTrendPoint[]
}

/* ── Helpers ───────────────────────────────────────────────── */
function ScoreRing({ score, max = 850 }: { score: number; max?: number }) {
  const radius = 44
  const circ = 2 * Math.PI * radius
  const pct = Math.min(score / max, 1)
  const dash = pct * circ

  const colour =
    pct >= 0.75 ? '#059669'
    : pct >= 0.5 ? '#6366f1'
    : pct >= 0.3 ? '#f59e0b'
    : '#ef4444'

  return (
    <svg viewBox="0 0 100 100" className="w-24 h-24 -rotate-90">
      <circle cx="50" cy="50" r={radius} fill="none" stroke="#f1f5f9" strokeWidth="9" />
      <circle
        cx="50" cy="50" r={radius} fill="none"
        stroke={colour} strokeWidth="9"
        strokeLinecap="round"
        strokeDasharray={`${dash} ${circ - dash}`}
        className="transition-all duration-1000 ease-out"
      />
    </svg>
  )
}

function BarMeter({ value }: { value: number }) {
  const pct = Math.min(Math.max(value, 0), 100)
  const colour =
    pct >= 70 ? 'bg-emerald-500'
    : pct >= 40 ? 'bg-indigo-400'
    : 'bg-amber-400'
  return (
    <div className="mt-2 h-2 bg-slate-100 rounded-full overflow-hidden">
      <div className={`h-full rounded-full transition-all duration-700 ${colour}`} style={{ width: `${pct}%` }} />
    </div>
  )
}

function stressBadgeVariant(label: string): 'success' | 'warning' | 'danger' | 'default' {
  const l = label?.toLowerCase() ?? ''
  if (l.includes('low')) return 'success'
  if (l.includes('moderate')) return 'warning'
  if (l.includes('high')) return 'danger'
  return 'default'
}

/* ── Main component ─────────────────────────────────────────── */
export default function EnterprisePage() {
  const router = useRouter()

  const [orgs, setOrgs] = useState<Org[] | null>(null)
  const [selectedOrgId, setSelectedOrgId] = useState<string | null>(null)
  const [metrics, setMetrics] = useState<OrgMetrics | null>(null)
  const [orgName, setOrgName] = useState('')
  const [loading, setLoading] = useState(true)
  const [metricsLoading, setMetricsLoading] = useState(false)
  const [copying, setCopying] = useState(false)
  const [copySuccess, setCopySuccess] = useState(false)

  /* fetch org list on mount */
  useEffect(() => {
    fetch('/api/organisations')
      .then(r => r.json())
      .then(({ orgs: list }: { orgs: Org[] }) => {
        setOrgs(list ?? [])
        if (list?.length) {
          setSelectedOrgId(list[0].id)
          setOrgName(list[0].name)
        }
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  /* fetch metrics whenever selected org changes */
  const fetchMetrics = useCallback((orgId: string) => {
    setMetricsLoading(true)
    fetch(`/api/organisations/${orgId}`)
      .then(r => r.json())
      .then(({ org, metrics: m }: { org: Org; metrics: OrgMetrics }) => {
        setMetrics(m)
        setOrgName(org?.name ?? '')
        setMetricsLoading(false)
      })
      .catch(() => setMetricsLoading(false))
  }, [])

  useEffect(() => {
    if (selectedOrgId) fetchMetrics(selectedOrgId)
  }, [selectedOrgId, fetchMetrics])

  /* invite link */
  const handleInvite = async () => {
    if (!selectedOrgId || copying) return
    setCopying(true)
    try {
      const res = await fetch(`/api/organisations/${selectedOrgId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
      const { inviteUrl } = await res.json()
      await navigator.clipboard.writeText(inviteUrl)
      setCopySuccess(true)
      setTimeout(() => setCopySuccess(false), 2500)
    } catch {
      /* ignore */
    } finally {
      setCopying(false)
    }
  }

  /* ── Loading state ─────────────────────────────────────────── */
  if (loading) {
    return (
      <div>
        <Topbar title="HR Admin Dashboard" subtitle="Enterprise insights" />
        <div className="p-8 flex items-center justify-center min-h-[60vh]">
          <div className="animate-pulse text-slate-400 text-sm">Loading...</div>
        </div>
      </div>
    )
  }

  /* ── No orgs → prompt setup ─────────────────────────────────── */
  if (orgs !== null && orgs.length === 0) {
    return (
      <div>
        <Topbar title="HR Admin Dashboard" subtitle="Enterprise insights" />
        <div className="p-8 flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center">
          <div className="w-14 h-14 rounded-2xl bg-indigo-50 flex items-center justify-center">
            <Landmark size={26} className="text-indigo-500" />
          </div>
          <h2 className="text-xl font-bold text-slate-800">No organisation yet</h2>
          <p className="text-slate-500 text-sm max-w-xs">
            Set up your organisation to unlock aggregate financial wellness insights for your team.
          </p>
          <button
            onClick={() => router.push('/enterprise/setup')}
            className="mt-2 px-6 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition-all"
          >
            Set up your organisation
          </button>
        </div>
      </div>
    )
  }

  /* ── Dashboard ──────────────────────────────────────────────── */
  return (
    <div>
      <Topbar
        title="HR Admin Dashboard"
        subtitle={orgName ? `${orgName} · Aggregate insights` : 'Aggregate insights'}
      />

      <div className="p-4 md:p-8 space-y-6 animate-fade-in">

        {/* Org selector (multiple orgs) */}
        {orgs && orgs.length > 1 && (
          <div className="flex items-center gap-3">
            <label className="text-sm font-medium text-slate-600">Organisation:</label>
            <select
              value={selectedOrgId ?? ''}
              onChange={e => {
                const org = orgs.find(o => o.id === e.target.value)
                setSelectedOrgId(e.target.value)
                if (org) setOrgName(org.name)
              }}
              className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-300"
            >
              {orgs.map(o => (
                <option key={o.id} value={o.id}>{o.name}</option>
              ))}
            </select>
          </div>
        )}

        {/* Action buttons */}
        <div className="flex flex-wrap gap-3">
          <button
            onClick={handleInvite}
            disabled={copying}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 disabled:opacity-60 transition-all"
          >
            <ClipboardCopy size={14} />
            {copySuccess ? 'Copied!' : copying ? 'Generating…' : 'Invite employees'}
          </button>
          <button
            disabled
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-100 text-slate-500 text-sm font-semibold cursor-not-allowed"
          >
            <Download size={14} />
            Download report
          </button>
          <button
            disabled
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-100 text-slate-500 text-sm font-semibold cursor-not-allowed"
          >
            <Settings size={14} />
            Configure benefits
          </button>
        </div>

        {/* Too small notice */}
        {metrics?.tooSmall && (
          <Card className="border-amber-200 bg-amber-50">
            <CardContent className="py-4 flex items-center gap-3">
              <AlertTriangle size={18} className="text-amber-600 shrink-0" />
              <p className="text-sm text-amber-800">
                Minimum 5 employees required for aggregate insights. Invite more employees.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Metrics skeleton */}
        {metricsLoading && (
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Card key={i}>
                <CardContent className="p-6 animate-pulse">
                  <div className="h-4 w-24 bg-slate-100 rounded mb-3" />
                  <div className="h-8 w-16 bg-slate-100 rounded" />
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Metrics cards */}
        {!metricsLoading && metrics && !metrics.tooSmall && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">

              {/* 1. Total employees */}
              <Card>
                <CardContent className="p-6 flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center shrink-0">
                    <Users size={20} className="text-indigo-500" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">Total Employees</p>
                    <p className="text-4xl font-black text-slate-800 leading-tight mt-0.5">{metrics.employeeCount}</p>
                  </div>
                </CardContent>
              </Card>

              {/* 2. Financial Wellness Score */}
              <Card>
                <CardContent className="p-6">
                  <p className="text-xs text-slate-500 font-medium uppercase tracking-wide mb-3">Financial Wellness Score</p>
                  <div className="flex items-center gap-4">
                    <div className="relative shrink-0">
                      <ScoreRing score={metrics.avgVaultScore} max={850} />
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className="text-xl font-black text-slate-800">{metrics.avgVaultScore}</span>
                        <span className="text-[9px] text-slate-400">/ 850</span>
                      </div>
                    </div>
                    <div>
                      <p className="text-sm text-slate-600">Avg score across</p>
                      <p className="text-sm font-semibold text-slate-800">all employees</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* 3. Stress Index */}
              <Card>
                <CardContent className="p-6 flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-rose-50 flex items-center justify-center shrink-0">
                    <AlertTriangle size={20} className="text-rose-400" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">Stress Index</p>
                    <div className="flex items-center gap-2 mt-1.5">
                      <Badge variant={stressBadgeVariant(metrics.stressLabel)}>
                        {metrics.stressLabel}
                      </Badge>
                      <span className="text-lg font-bold text-slate-700">
                        {metrics.latestStressAvg.toFixed(1)}
                        <span className="text-xs text-slate-400 font-normal">/10</span>
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* 4. Weekly Engagement Rate */}
              <Card>
                <CardContent className="p-6 flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center shrink-0">
                    <Calendar size={20} className="text-emerald-500" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">Weekly Engagement</p>
                    <p className="text-3xl font-black text-slate-800 mt-0.5">
                      {metrics.checkInRate.toFixed(0)}
                      <span className="text-base font-semibold text-slate-400">%</span>
                    </p>
                    <BarMeter value={metrics.checkInRate} />
                  </div>
                </CardContent>
              </Card>

              {/* 5. % with Pension */}
              <Card>
                <CardContent className="p-6 flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center shrink-0">
                    <Landmark size={20} className="text-amber-500" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">With Pension</p>
                    <p className="text-3xl font-black text-slate-800 mt-0.5">
                      {metrics.pctWithPension.toFixed(0)}
                      <span className="text-base font-semibold text-slate-400">%</span>
                    </p>
                    <BarMeter value={metrics.pctWithPension} />
                  </div>
                </CardContent>
              </Card>

              {/* 6. % with Investments */}
              <Card>
                <CardContent className="p-6 flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center shrink-0">
                    <TrendingUp size={20} className="text-purple-500" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">With Investments</p>
                    <p className="text-3xl font-black text-slate-800 mt-0.5">
                      {metrics.pctWithInvestments.toFixed(0)}
                      <span className="text-base font-semibold text-slate-400">%</span>
                    </p>
                    <BarMeter value={metrics.pctWithInvestments} />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Stress trend chart */}
            {metrics.stressTrend?.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <LineChart size={16} className="text-slate-400" />
                    Stress Trend (12 weeks)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={metrics.stressTrend} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                      <XAxis
                        dataKey="week"
                        tick={{ fontSize: 10, fill: '#94a3b8' }}
                        tickLine={false}
                        axisLine={false}
                      />
                      <YAxis
                        domain={[0, 10]}
                        tick={{ fontSize: 10, fill: '#94a3b8' }}
                        tickLine={false}
                        axisLine={false}
                      />
                      <Tooltip
                        contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e2e8f0' }}
                        formatter={(v) => [v != null ? Number(v).toFixed(1) : "0", "Avg stress"]}
                      />
                      <Bar dataKey="avg_stress" radius={[4, 4, 0, 0]} maxBarSize={32}>
                        {metrics.stressTrend.map((entry, i) => (
                          <Cell
                            key={i}
                            fill={
                              entry.avg_stress >= 7 ? '#f87171'
                              : entry.avg_stress >= 5 ? '#fb923c'
                              : '#34d399'
                            }
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </div>
  )
}
