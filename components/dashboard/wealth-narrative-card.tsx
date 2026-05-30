'use client'
import { useEffect, useState } from 'react'
import { BookOpen, ChevronDown, ChevronUp, Sparkles } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface Narrative {
  id: string
  month: string
  headline: string
  content: string
  score_at_time: number | null
  created_at: string
  isNew?: boolean
}

function monthLabel(month: string) {
  const [y, m] = month.split('-')
  return new Date(Number(y), Number(m) - 1, 1)
    .toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })
}

export function WealthNarrativeCard() {
  const [narrative, setNarrative] = useState<Narrative | null>(null)
  const [past, setPast] = useState<Narrative[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState(false)
  const [showArchive, setShowArchive] = useState(false)
  const [generating, setGenerating] = useState(false)

  useEffect(() => {
    setGenerating(true)
    fetch('/api/narrative')
      .then(r => r.json())
      .then(({ narrative: n, past: p }) => {
        setNarrative(n)
        setPast(p || [])
        setLoading(false)
        setGenerating(false)
      })
      .catch(() => { setLoading(false); setGenerating(false) })
  }, [])

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6 space-y-3">
          <div className="flex items-center gap-2">
            <Sparkles size={15} className="text-indigo-400 animate-pulse" />
            <span className="text-sm text-slate-500">
              {generating ? 'Generating your wealth story…' : 'Loading…'}
            </span>
          </div>
          <div className="space-y-2 animate-pulse">
            <div className="h-5 w-3/4 bg-slate-100 rounded" />
            <div className="h-4 w-full bg-slate-100 rounded" />
            <div className="h-4 w-5/6 bg-slate-100 rounded" />
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!narrative) return null

  const preview = narrative.content.split(' ').slice(0, 30).join(' ') + '…'

  return (
    <Card className="overflow-hidden border-indigo-100">
      <CardHeader className="pb-2 bg-gradient-to-r from-indigo-50/60 to-violet-50/40">
        <CardTitle className="text-base flex items-center justify-between">
          <span className="flex items-center gap-2">
            <BookOpen size={16} className="text-indigo-500" />
            Your Wealth Story
          </span>
          <span className="text-[10px] bg-indigo-100 text-indigo-600 px-2 py-0.5 rounded-full font-semibold">
            {monthLabel(narrative.month)}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-4">
        {/* New badge */}
        {narrative.isNew && (
          <div className="flex items-center gap-1.5 mb-3">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
            <span className="text-xs text-indigo-500 font-medium">New this month</span>
          </div>
        )}

        {/* Headline */}
        <p className="font-semibold text-slate-800 text-sm leading-snug mb-3">
          {narrative.headline}
        </p>

        {/* Content — collapsed or full */}
        <p className="text-sm text-slate-600 leading-relaxed">
          {expanded ? narrative.content : preview}
        </p>

        <button
          onClick={() => setExpanded(e => !e)}
          className="flex items-center gap-1 text-xs text-indigo-500 font-medium mt-2 hover:text-indigo-700 transition-colors"
        >
          {expanded ? <><ChevronUp size={13} /> Read less</> : <><ChevronDown size={13} /> Read full story</>}
        </button>

        {/* Vault score at time */}
        {narrative.score_at_time !== null && (
          <div className="mt-4 flex items-center gap-2 bg-slate-50 rounded-xl px-3 py-2">
            <span className="text-xs text-slate-500">Vault Score this month:</span>
            <span className="text-sm font-bold text-indigo-600">{narrative.score_at_time}/850</span>
          </div>
        )}

        {/* Archive */}
        {past.length > 0 && (
          <div className="mt-4 pt-3 border-t border-slate-100">
            <button
              onClick={() => setShowArchive(a => !a)}
              className="flex items-center gap-1 text-xs text-slate-400 font-medium hover:text-slate-600 transition-colors"
            >
              {showArchive ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
              Past stories ({past.length})
            </button>
            {showArchive && (
              <div className="mt-2 space-y-2">
                {past.map(p => (
                  <div key={p.id} className="pl-3 border-l-2 border-slate-100">
                    <p className="text-[11px] text-slate-400">{monthLabel(p.month)}</p>
                    <p className="text-xs text-slate-600 font-medium">{p.headline}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
