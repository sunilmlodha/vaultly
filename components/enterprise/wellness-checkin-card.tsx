'use client'

import { useEffect, useState } from 'react'

// Inlined — avoids importing server-only lib/enterprise/wellness.ts from a client component
function stressLabel(score: number) {
  if (score <= 1) return { label: 'Very calm',     emoji: '😌', colour: 'text-emerald-600' }
  if (score <= 2) return { label: 'Manageable',    emoji: '🙂', colour: 'text-green-500'   }
  if (score <= 3) return { label: 'Some pressure', emoji: '😐', colour: 'text-amber-500'   }
  if (score <= 4) return { label: 'Stressed',      emoji: '😟', colour: 'text-orange-500'  }
  return               { label: 'Very stressed',   emoji: '😰', colour: 'text-red-500'     }
}

interface HistoryRow {
  week: string
  stress_score: number
  checked_finances: number
  win: string | null
  focus: string | null
  created_at: string
}

interface LatestCheckin {
  stress_score: number
  checked_finances: number
  win: string | null
  focus: string | null
}

interface WellnessData {
  latest: LatestCheckin | null
  history: HistoryRow[]
  checkedInThisWeek: boolean
}

const STRESS_OPTIONS = [
  { score: 1, emoji: '😌', desc: 'Very calm' },
  { score: 2, emoji: '🙂', desc: 'Manageable' },
  { score: 3, emoji: '😐', desc: 'Some pressure' },
  { score: 4, emoji: '😟', desc: 'Stressed' },
  { score: 5, emoji: '😰', desc: 'Very stressed' },
]

export function WellnessCheckinCard() {
  const [data, setData] = useState<WellnessData | null>(null)
  const [loading, setLoading] = useState(true)
  const [step, setStep] = useState(1)
  const [stressScore, setStressScore] = useState<number | null>(null)
  const [checkedFinances, setCheckedFinances] = useState<boolean | null>(null)
  const [win, setWin] = useState('')
  const [focus, setFocus] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)
  const [completedData, setCompletedData] = useState<WellnessData | null>(null)

  useEffect(() => {
    fetch('/api/wellness')
      .then((r) => r.json())
      .then((d: WellnessData) => {
        setData(d)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  async function handleSubmit() {
    if (stressScore === null || checkedFinances === null) return
    setSubmitting(true)
    try {
      await fetch('/api/wellness', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stressScore, checkedFinances, win: win || undefined, focus: focus || undefined }),
      })
      // Refresh data
      const r = await fetch('/api/wellness')
      const updated: WellnessData = await r.json()
      setCompletedData(updated)
      setDone(true)
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="rounded-2xl border border-border bg-card p-4 flex items-center justify-center h-24">
        <span className="text-muted-foreground text-sm animate-pulse">Loading wellness…</span>
      </div>
    )
  }

  // Already checked in or just completed
  const displayData = done ? completedData : data
  if (displayData?.checkedInThisWeek && displayData.latest) {
    const sl = stressLabel(displayData.latest.stress_score)
    const history = displayData.history ?? []
    const maxScore = 5

    return (
      <div className="rounded-2xl border border-border bg-card p-4 space-y-3 max-h-72 overflow-y-auto">
        {done && (
          <p className="text-center text-base font-semibold text-emerald-600">✨ Check-in complete!</p>
        )}

        <div className="flex items-center gap-2">
          <span className="text-2xl">{sl.emoji}</span>
          <div>
            <p className={`font-semibold text-sm ${sl.colour}`}>{sl.label}</p>
            <p className="text-xs text-muted-foreground">Checked in this week ✓</p>
          </div>
        </div>

        {displayData.latest.win && (
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Win</p>
            <p className="text-sm text-foreground">{displayData.latest.win}</p>
          </div>
        )}
        {displayData.latest.focus && (
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Focus</p>
            <p className="text-sm text-foreground">{displayData.latest.focus}</p>
          </div>
        )}

        {history.length > 0 && (
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
              12-week stress trend
            </p>
            <div className="flex items-end gap-0.5 h-8">
              {history.map((row, i) => {
                const pct = ((row.stress_score / maxScore) * 100).toFixed(0)
                const sl2 = stressLabel(row.stress_score)
                return (
                  <div
                    key={i}
                    title={`${row.week}: ${sl2.emoji} ${sl2.label}`}
                    className="flex-1 rounded-sm transition-all"
                    style={{
                      height: `${pct}%`,
                      background:
                        row.stress_score <= 2
                          ? '#10b981'
                          : row.stress_score === 3
                          ? '#f59e0b'
                          : '#ef4444',
                    }}
                  />
                )
              })}
            </div>
          </div>
        )}

        <p className="text-xs text-muted-foreground text-right">Next check-in: Monday</p>
      </div>
    )
  }

  // Check-in flow
  return (
    <div className="rounded-2xl border border-border bg-card p-4 space-y-3 max-h-72 overflow-y-auto">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-sm text-foreground">Weekly Wellness Check-in</h3>
        <span className="text-xs text-muted-foreground">Step {step} of 5</span>
      </div>

      {/* Progress dots */}
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((s) => (
          <div
            key={s}
            className={`h-1 flex-1 rounded-full transition-colors ${
              s <= step ? 'bg-primary' : 'bg-muted'
            }`}
          />
        ))}
      </div>

      {step === 1 && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-foreground">How stressed are you this week?</p>
          <div className="flex gap-1 flex-wrap">
            {STRESS_OPTIONS.map((o) => (
              <button
                key={o.score}
                onClick={() => {
                  setStressScore(o.score)
                  setStep(2)
                }}
                className={`flex flex-col items-center p-2 rounded-xl border text-xs transition-colors hover:bg-accent ${
                  stressScore === o.score ? 'border-primary bg-primary/10' : 'border-border'
                }`}
              >
                <span className="text-xl">{o.emoji}</span>
                <span className="text-muted-foreground mt-0.5">{o.score}</span>
              </button>
            ))}
          </div>
          {stressScore !== null && (
            <p className="text-xs text-muted-foreground">
              Selected: {STRESS_OPTIONS.find((o) => o.score === stressScore)?.desc}
            </p>
          )}
        </div>
      )}

      {step === 2 && (
        <div className="space-y-3">
          <p className="text-sm font-medium text-foreground">Did you check your finances this week?</p>
          <div className="flex gap-2">
            <button
              onClick={() => { setCheckedFinances(true); setStep(3) }}
              className="flex-1 py-2 rounded-xl border border-border text-sm font-medium hover:bg-accent transition-colors"
            >
              Yes
            </button>
            <button
              onClick={() => { setCheckedFinances(false); setStep(3) }}
              className="flex-1 py-2 rounded-xl border border-border text-sm font-medium hover:bg-accent transition-colors"
            >
              No
            </button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-foreground">Any financial win this week?</p>
          <p className="text-xs text-muted-foreground">Optional</p>
          <textarea
            value={win}
            onChange={(e) => setWin(e.target.value)}
            placeholder="e.g. Paid off a credit card…"
            className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm resize-none h-16 focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <div className="flex gap-2">
            <button
              onClick={() => setStep(4)}
              className="text-xs text-muted-foreground underline"
            >
              Skip
            </button>
            <button
              onClick={() => setStep(4)}
              className="ml-auto px-4 py-1.5 rounded-xl bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {step === 4 && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-foreground">What's your financial focus this week?</p>
          <p className="text-xs text-muted-foreground">Optional</p>
          <textarea
            value={focus}
            onChange={(e) => setFocus(e.target.value)}
            placeholder="e.g. Build emergency fund…"
            className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm resize-none h-16 focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <div className="flex gap-2">
            <button
              onClick={() => setStep(5)}
              className="text-xs text-muted-foreground underline"
            >
              Skip
            </button>
            <button
              onClick={() => setStep(5)}
              className="ml-auto px-4 py-1.5 rounded-xl bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {step === 5 && (
        <div className="space-y-3">
          <p className="text-sm font-medium text-foreground">Ready to submit your check-in?</p>
          {stressScore !== null && (
            <div className="flex items-center gap-2 text-sm">
              <span className="text-lg">{STRESS_OPTIONS.find((o) => o.score === stressScore)?.emoji}</span>
              <span className="text-muted-foreground">
                {STRESS_OPTIONS.find((o) => o.score === stressScore)?.desc}
              </span>
            </div>
          )}
          {win && <p className="text-xs text-muted-foreground">Win: {win}</p>}
          {focus && <p className="text-xs text-muted-foreground">Focus: {focus}</p>}
          <button
            disabled={submitting || stressScore === null || checkedFinances === null}
            onClick={handleSubmit}
            className="w-full py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {submitting ? 'Submitting…' : 'Submit Check-in'}
          </button>
        </div>
      )}
    </div>
  )
}
