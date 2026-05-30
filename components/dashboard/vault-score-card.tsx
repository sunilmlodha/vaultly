'use client'
import { useEffect, useState } from 'react'
import { TrendingUp, TrendingDown, Minus, Info } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface VaultScoreComponents {
  net_worth_momentum: number
  emergency_buffer: number
  goal_velocity: number
  debt_health: number
  renewal_control: number
  engagement: number
}

interface VaultScoreData {
  score: number
  components: VaultScoreComponents
  trend: number
  label: string
  colour: string
  netWorth: number
}

const COMPONENT_META: Record<keyof VaultScoreComponents, { label: string; max: number; emoji: string }> = {
  net_worth_momentum: { label: 'Net worth growth',  max: 250, emoji: '📈' },
  emergency_buffer:   { label: 'Emergency buffer',  max: 150, emoji: '🛡️' },
  goal_velocity:      { label: 'Goal progress',     max: 200, emoji: '🎯' },
  debt_health:        { label: 'Debt health',        max: 150, emoji: '💳' },
  renewal_control:    { label: 'Renewal control',    max: 100, emoji: '🔄' },
  engagement:         { label: 'App engagement',     max: 50,  emoji: '⚡' },
}

function ScoreRing({ score, colour }: { score: number; colour: string }) {
  const radius = 54
  const circumference = 2 * Math.PI * radius
  const pct = score / 850
  const dash = pct * circumference
  const gap = circumference - dash

  const strokeColour = colour.includes('emerald') ? '#059669'
    : colour.includes('green') ? '#22c55e'
    : colour.includes('indigo') ? '#6366f1'
    : colour.includes('amber') ? '#f59e0b'
    : '#94a3b8'

  return (
    <svg viewBox="0 0 120 120" className="w-32 h-32 -rotate-90">
      <circle cx="60" cy="60" r={radius} fill="none" stroke="#f1f5f9" strokeWidth="10" />
      <circle
        cx="60" cy="60" r={radius} fill="none"
        stroke={strokeColour} strokeWidth="10"
        strokeLinecap="round"
        strokeDasharray={`${dash} ${gap}`}
        className="transition-all duration-1000 ease-out"
      />
    </svg>
  )
}

export function VaultScoreCard() {
  const [data, setData] = useState<VaultScoreData | null>(null)
  const [history, setHistory] = useState<{ score: number; created_at: string }[]>([])
  const [loading, setLoading] = useState(true)
  const [showBreakdown, setShowBreakdown] = useState(false)

  useEffect(() => {
    fetch('/api/vault-score')
      .then(r => r.json())
      .then(({ vaultScore, history: h }) => {
        setData(vaultScore)
        setHistory(h || [])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-4 animate-pulse">
            <div className="w-32 h-32 rounded-full bg-slate-100" />
            <div className="space-y-2">
              <div className="h-6 w-24 bg-slate-100 rounded" />
              <div className="h-4 w-32 bg-slate-100 rounded" />
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!data) return null

  const TrendIcon = data.trend > 0 ? TrendingUp : data.trend < 0 ? TrendingDown : Minus
  const trendColour = data.trend > 0 ? 'text-emerald-600' : data.trend < 0 ? 'text-rose-500' : 'text-slate-400'

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center justify-between">
          <span className="flex items-center gap-2">
            🏆 Vault Score
          </span>
          <button
            onClick={() => setShowBreakdown(b => !b)}
            className="text-slate-400 hover:text-slate-600 transition-colors"
          >
            <Info size={15} />
          </button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-6">
          {/* Ring */}
          <div className="relative shrink-0">
            <ScoreRing score={data.score} colour={data.colour} />
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className={`text-3xl font-black ${data.colour}`}>{data.score}</span>
              <span className="text-[10px] text-slate-400 font-medium">/ 850</span>
            </div>
          </div>

          {/* Details */}
          <div className="flex-1">
            <p className={`text-xl font-bold ${data.colour}`}>{data.label}</p>
            <div className={`flex items-center gap-1 text-sm font-medium mt-1 ${trendColour}`}>
              <TrendIcon size={14} />
              {data.trend === 0
                ? 'Unchanged this week'
                : `${data.trend > 0 ? '+' : ''}${data.trend} pts this week`}
            </div>

            {/* Mini sparkline from history */}
            {history.length > 1 && (
              <div className="flex items-end gap-0.5 mt-3 h-8">
                {history.slice(-10).map((h, i) => {
                  const pct = Math.max((h.score / 850) * 100, 5)
                  return (
                    <div
                      key={i}
                      className="flex-1 rounded-sm bg-indigo-200 transition-all"
                      style={{ height: `${pct}%` }}
                      title={`${h.score} pts`}
                    />
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* Breakdown */}
        {showBreakdown && (
          <div className="mt-4 space-y-2 pt-4 border-t border-slate-100">
            {(Object.keys(COMPONENT_META) as (keyof VaultScoreComponents)[]).map(key => {
              const meta = COMPONENT_META[key]
              const val = data.components[key]
              const pct = (val / meta.max) * 100
              return (
                <div key={key} className="flex items-center gap-3">
                  <span className="text-sm w-4">{meta.emoji}</span>
                  <div className="flex-1">
                    <div className="flex justify-between mb-0.5">
                      <span className="text-xs text-slate-600">{meta.label}</span>
                      <span className="text-xs font-medium text-slate-700">{val}/{meta.max}</span>
                    </div>
                    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-indigo-500 rounded-full transition-all duration-700"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                </div>
              )
            })}
            <p className="text-xs text-slate-400 pt-1">Score updates daily. Max 850.</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
