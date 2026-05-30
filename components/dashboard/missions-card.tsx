'use client'
import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Zap, Clock, ChevronRight } from 'lucide-react'
import Link from 'next/link'

interface Mission {
  id: string
  title: string
  description: string
  icon: string
  xp: number
  type: 'weekly' | 'monthly'
  target: number
  progress: number
  pct: number
  completed: boolean
  daysLeft: number
  tip: string
}

interface XPInfo {
  total: number
  level: number
  xpInLevel: number
  xpNeeded: number
  pct: number
}

export function MissionsCard() {
  const [missions, setMissions] = useState<Mission[]>([])
  const [xp, setXp] = useState<XPInfo | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/missions')
      .then(r => r.json())
      .then(({ missions: m, xp: x }) => {
        setMissions(m || [])
        setXp(x)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  const weekly = missions.filter(m => m.type === 'weekly')
  const monthly = missions.filter(m => m.type === 'monthly')
  const completedCount = missions.filter(m => m.completed).length

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-3">
            <div className="h-4 w-32 bg-slate-100 rounded" />
            {[1, 2, 3].map(i => <div key={i} className="h-16 bg-slate-100 rounded-xl" />)}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Zap size={16} className="text-amber-500" />
            Missions
          </span>
          <Link href="/achievements" className="text-xs text-indigo-500 font-medium flex items-center gap-0.5 hover:text-indigo-700">
            All <ChevronRight size={12} />
          </Link>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">

        {/* XP Level bar */}
        {xp && (
          <div className="bg-gradient-to-r from-indigo-50 to-violet-50 rounded-2xl px-4 py-3">
            <div className="flex justify-between items-center mb-1.5">
              <span className="text-xs font-semibold text-indigo-700">Level {xp.level}</span>
              <span className="text-xs text-indigo-400">{xp.xpInLevel}/{xp.xpNeeded} XP</span>
            </div>
            <div className="h-2 bg-indigo-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 rounded-full transition-all duration-700"
                style={{ width: `${xp.pct}%` }}
              />
            </div>
            <p className="text-[10px] text-indigo-400 mt-1">{xp.total} total XP · {completedCount}/{missions.length} missions done</p>
          </div>
        )}

        {/* Weekly missions */}
        {weekly.length > 0 && (
          <div className="space-y-2">
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">This week</p>
            {weekly.map(m => <MissionRow key={m.id} mission={m} />)}
          </div>
        )}

        {/* Monthly missions */}
        {monthly.length > 0 && (
          <div className="space-y-2">
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">This month</p>
            {monthly.map(m => <MissionRow key={m.id} mission={m} />)}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function MissionRow({ mission: m }: { mission: Mission }) {
  return (
    <div className={`relative rounded-2xl border p-3 transition-all ${
      m.completed
        ? 'bg-emerald-50 border-emerald-200'
        : 'bg-white border-slate-100 hover:border-indigo-200'
    }`}>
      <div className="flex items-start gap-3">
        <span className="text-xl mt-0.5">{m.icon}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <p className={`text-sm font-semibold ${m.completed ? 'text-emerald-700' : 'text-slate-800'}`}>
              {m.title}
            </p>
            <span className="shrink-0 text-[11px] font-bold text-amber-500 bg-amber-50 px-2 py-0.5 rounded-full">
              +{m.xp} XP
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">{m.description}</p>

          {/* Progress bar */}
          {!m.completed && m.target > 1 && (
            <div className="mt-2">
              <div className="flex justify-between text-[10px] text-slate-400 mb-1">
                <span>{m.progress}/{m.target}</span>
                <span>{m.pct}%</span>
              </div>
              <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-indigo-400 rounded-full transition-all"
                  style={{ width: `${m.pct}%` }}
                />
              </div>
            </div>
          )}

          {m.completed ? (
            <p className="text-[11px] text-emerald-600 font-semibold mt-1">✓ Complete!</p>
          ) : (
            <div className="flex items-center gap-1 mt-1">
              <Clock size={10} className="text-slate-300" />
              <span className="text-[10px] text-slate-400">{m.daysLeft}d left · {m.tip}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
