'use client'
import { useEffect, useState } from 'react'
import { X, ExternalLink, TrendingUp, Home, RefreshCw, PiggyBank, Shield } from 'lucide-react'

interface Nudge {
  triggerKey: string
  priority: number
  partnerId: string
  headline: string
  body: string
  cta: string
  url: string
  category: string
  riskWarning: string | null
  estimatedCommission: number
}

const CATEGORY_META: Record<string, { icon: React.ReactNode; colour: string; label: string }> = {
  investment: { icon: <TrendingUp size={14} />, colour: 'bg-emerald-50 border-emerald-200 text-emerald-700', label: 'Investment opportunity' },
  pension:    { icon: <PiggyBank size={14} />, colour: 'bg-violet-50 border-violet-200 text-violet-700',   label: 'Pension' },
  mortgage:   { icon: <Home size={14} />,       colour: 'bg-amber-50 border-amber-200 text-amber-700',     label: 'Mortgage' },
  savings:    { icon: <TrendingUp size={14} />, colour: 'bg-blue-50 border-blue-200 text-blue-700',        label: 'Savings' },
  insurance:  { icon: <Shield size={14} />,     colour: 'bg-rose-50 border-rose-200 text-rose-700',        label: 'Insurance' },
}

function NudgeCard({ nudge, onDismiss }: { nudge: Nudge; onDismiss: (key: string) => void }) {
  const meta = CATEGORY_META[nudge.category] ?? CATEGORY_META.investment

  const handleClick = async () => {
    await fetch('/api/referrals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ triggerKey: nudge.triggerKey, action: 'click' }),
    })
    window.open(nudge.url, '_blank', 'noopener,noreferrer')
  }

  const handleDismiss = async () => {
    await fetch('/api/referrals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ triggerKey: nudge.triggerKey, action: 'dismiss' }),
    })
    onDismiss(nudge.triggerKey)
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow overflow-hidden">
      {/* Category bar */}
      <div className={`flex items-center justify-between px-4 py-2 border-b ${meta.colour}`}>
        <div className="flex items-center gap-1.5 text-xs font-semibold">
          {meta.icon}
          {meta.label}
        </div>
        <button
          onClick={handleDismiss}
          className="p-0.5 rounded-lg hover:bg-white/50 transition-colors opacity-60 hover:opacity-100"
          aria-label="Dismiss"
        >
          <X size={12} />
        </button>
      </div>

      <div className="px-4 py-4">
        <h3 className="font-bold text-slate-800 text-sm mb-1.5">{nudge.headline}</h3>
        <p className="text-xs text-slate-500 leading-relaxed mb-4">{nudge.body}</p>

        <button
          onClick={handleClick}
          className="w-full flex items-center justify-center gap-2 py-2.5 bg-indigo-500 hover:bg-indigo-600 text-white text-xs font-bold rounded-xl transition-colors"
        >
          {nudge.cta} <ExternalLink size={11} />
        </button>

        {nudge.riskWarning && (
          <p className="text-[10px] text-slate-400 mt-2 leading-snug text-center">{nudge.riskWarning}</p>
        )}
      </div>
    </div>
  )
}

export function ReferralNudges({ maxVisible = 2 }: { maxVisible?: number }) {
  const [nudges, setNudges] = useState<Nudge[]>([])
  const [dismissed, setDismissed] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/referrals')
      .then(r => r.json())
      .then(({ nudges: n }) => {
        setNudges(n || [])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  const visible = nudges
    .filter(n => !dismissed.has(n.triggerKey))
    .slice(0, maxVisible)

  const handleDismiss = (key: string) => {
    setDismissed(prev => new Set([...prev, key]))
  }

  if (loading) return (
    <div className="space-y-3">
      <div className="h-3 w-40 bg-slate-100 rounded animate-pulse" />
      <div className="h-28 bg-slate-50 rounded-2xl border border-slate-100 animate-pulse" />
    </div>
  )

  if (visible.length === 0) return null

  return (
    <div className="space-y-3">
      <p className="text-[11px] text-slate-400 font-semibold uppercase tracking-wide px-1">
        Personalised suggestions
      </p>
      {visible.map(nudge => (
        <NudgeCard key={nudge.triggerKey} nudge={nudge} onDismiss={handleDismiss} />
      ))}
      <p className="text-[10px] text-slate-300 text-center">
        Suggestions are based on your vault data. Vaultly may earn a referral fee.
      </p>
    </div>
  )
}
