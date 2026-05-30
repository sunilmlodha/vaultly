'use client'
import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { Topbar } from '@/components/layout/topbar'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Trophy, Zap, Flame, Lock } from 'lucide-react'

interface Trophy {
  id: string
  title: string
  description: string
  icon: string
  category: string
  xp: number
  earned_at?: string
}

interface Mission {
  id: string
  title: string
  icon: string
  xp: number
  type: string
  target: number
  progress: number
  pct: number
  completed: boolean
  daysLeft: number
  tip: string
}

interface StreakData {
  currentStreak: number
  longestStreak: number
  totalCheckins: number
  freezeTokens: number
  checkedInToday: boolean
}

const CATEGORY_LABELS: Record<string, string> = {
  wealth: '💰 Wealth',
  score: '🏆 Vault Score',
  goals: '🎯 Goals',
  debt: '💳 Debt',
  renewals: '🔔 Renewals',
  streaks: '🔥 Streaks',
  missions: '⚡ Missions',
  documents: '📄 Documents',
  family: '👨‍👩‍👧 Family',
}

export default function AchievementsPage() {
  const { data: session } = useSession()
  const [earned, setEarned] = useState<Trophy[]>([])
  const [locked, setLocked] = useState<Trophy[]>([])
  const [missions, setMissions] = useState<Mission[]>([])
  const [streak, setStreak] = useState<StreakData | null>(null)
  const [xp, setXp] = useState<{ total: number; level: number; xpInLevel: number; xpNeeded: number; pct: number } | null>(null)
  const [newlyEarned, setNewlyEarned] = useState<Trophy[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      fetch('/api/trophies').then(r => r.json()),
      fetch('/api/missions').then(r => r.json()),
      fetch('/api/streaks').then(r => r.json()),
    ]).then(([t, m, s]) => {
      setEarned(t.earned || [])
      setLocked(t.locked || [])
      setNewlyEarned(t.newlyEarned || [])
      setMissions(m.missions || [])
      setXp(m.xp)
      setStreak(s.streak)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  const categories = [...new Set([...earned, ...locked].map(t => t.category))]

  return (
    <div>
      <Topbar title="Achievements" subtitle="Trophies, missions and streaks" userName={session?.user?.name ?? ''} />
      <div className="p-4 md:p-8 max-w-4xl mx-auto space-y-6 animate-fade-in">

        {/* Newly earned toast */}
        {newlyEarned.length > 0 && (
          <div className="bg-gradient-to-r from-amber-50 to-yellow-50 border border-amber-200 rounded-2xl p-4">
            <p className="font-semibold text-amber-800 mb-2">🎉 New trophies unlocked!</p>
            <div className="flex flex-wrap gap-2">
              {newlyEarned.map(t => (
                <span key={t.id} className="flex items-center gap-1.5 bg-white border border-amber-200 px-3 py-1.5 rounded-xl text-sm font-medium text-amber-700">
                  {t.icon} {t.title} <span className="text-[11px] text-amber-400">+{t.xp} XP</span>
                </span>
              ))}
            </div>
          </div>
        )}

        {/* XP + Level */}
        {xp && (
          <Card>
            <CardContent className="pt-5 pb-4">
              <div className="flex items-center gap-5">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex flex-col items-center justify-center shrink-0">
                  <span className="text-[10px] text-indigo-200 font-medium">LVL</span>
                  <span className="text-2xl font-black text-white leading-none">{xp.level}</span>
                </div>
                <div className="flex-1">
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-semibold text-slate-800">Level {xp.level}</span>
                    <span className="text-slate-400">{xp.xpInLevel}/{xp.xpNeeded} XP to next level</span>
                  </div>
                  <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 rounded-full transition-all"
                      style={{ width: `${xp.pct}%` }}
                    />
                  </div>
                  <p className="text-xs text-slate-400 mt-1">{xp.total} total XP</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Streak stats */}
        {streak && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Flame size={16} className="text-orange-500" /> Streaks
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="bg-orange-50 rounded-2xl p-3">
                  <p className="text-2xl font-black text-orange-500">{streak.currentStreak}</p>
                  <p className="text-xs text-orange-400 font-medium">Current streak</p>
                </div>
                <div className="bg-slate-50 rounded-2xl p-3">
                  <p className="text-2xl font-black text-slate-700">{streak.longestStreak}</p>
                  <p className="text-xs text-slate-400 font-medium">Best streak</p>
                </div>
                <div className="bg-slate-50 rounded-2xl p-3">
                  <p className="text-2xl font-black text-slate-700">{streak.totalCheckins}</p>
                  <p className="text-xs text-slate-400 font-medium">Total check-ins</p>
                </div>
              </div>
              {streak.freezeTokens > 0 && (
                <p className="text-xs text-slate-400 mt-3 text-center">
                  🧊 {streak.freezeTokens} freeze token{streak.freezeTokens > 1 ? 's' : ''} — protects your streak if you miss a day
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Active missions */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Zap size={16} className="text-amber-500" /> Active Missions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {loading ? (
              <div className="space-y-2 animate-pulse">
                {[1,2,3].map(i => <div key={i} className="h-14 bg-slate-100 rounded-xl" />)}
              </div>
            ) : missions.map(m => (
              <div key={m.id} className={`flex items-center gap-3 px-4 py-3 rounded-xl border ${
                m.completed ? 'bg-emerald-50 border-emerald-200' : 'bg-white border-slate-100'
              }`}>
                <span className="text-xl">{m.icon}</span>
                <div className="flex-1">
                  <div className="flex justify-between items-center">
                    <p className="text-sm font-semibold text-slate-800">{m.title}</p>
                    <span className="text-[11px] font-bold text-amber-500">+{m.xp} XP</span>
                  </div>
                  {!m.completed && m.target > 1 && (
                    <div className="flex items-center gap-2 mt-1">
                      <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-indigo-400 rounded-full" style={{ width: `${m.pct}%` }} />
                      </div>
                      <span className="text-[10px] text-slate-400">{m.progress}/{m.target}</span>
                    </div>
                  )}
                  {m.completed && <p className="text-[11px] text-emerald-600 font-semibold">✓ Complete!</p>}
                  {!m.completed && <p className="text-[10px] text-slate-400 mt-0.5">{m.daysLeft}d left · {m.tip}</p>}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Trophies by category */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Trophy size={16} className="text-indigo-500" />
              Trophies — {earned.length} / {earned.length + locked.length} earned
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            {loading ? (
              <div className="grid grid-cols-3 gap-3 animate-pulse">
                {[...Array(9)].map((_, i) => <div key={i} className="h-20 bg-slate-100 rounded-2xl" />)}
              </div>
            ) : categories.map(cat => {
              const catEarned = earned.filter(t => t.category === cat)
              const catLocked = locked.filter(t => t.category === cat)
              return (
                <div key={cat}>
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">
                    {CATEGORY_LABELS[cat] ?? cat}
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {[...catEarned, ...catLocked].map(t => {
                      const isEarned = catEarned.some(e => e.id === t.id)
                      const earnedTrophy = isEarned ? t as Trophy & { earned_at: string } : null
                      return (
                        <div
                          key={t.id}
                          className={`relative flex flex-col items-center text-center p-3 rounded-2xl border transition-all ${
                            isEarned
                              ? 'bg-gradient-to-b from-amber-50 to-yellow-50 border-amber-200 shadow-sm'
                              : 'bg-slate-50 border-slate-100 opacity-50'
                          }`}
                        >
                          <span className="text-2xl mb-1">{isEarned ? t.icon : '🔒'}</span>
                          <p className={`text-xs font-semibold leading-tight ${isEarned ? 'text-slate-800' : 'text-slate-400'}`}>
                            {t.title}
                          </p>
                          <p className="text-[10px] text-slate-400 mt-0.5 leading-tight">{t.description}</p>
                          {isEarned && (
                            <span className="mt-1.5 text-[10px] font-bold text-amber-500">+{t.xp} XP</span>
                          )}
                          {isEarned && earnedTrophy?.earned_at && (
                            <p className="text-[9px] text-slate-300 mt-0.5">
                              {new Date(earnedTrophy.earned_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                            </p>
                          )}
                          {!isEarned && (
                            <Lock size={8} className="absolute top-2 right-2 text-slate-300" />
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
