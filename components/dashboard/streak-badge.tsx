'use client'
import { useEffect, useState } from 'react'

interface StreakData {
  currentStreak: number
  longestStreak: number
  freezeTokens: number
  checkedInToday: boolean
}

export function StreakBadge() {
  const [streak, setStreak] = useState<StreakData | null>(null)

  useEffect(() => {
    // Record check-in on mount
    fetch('/api/streaks', { method: 'POST' })
      .then(r => r.json())
      .then(({ streak: s }) => setStreak(s))
      .catch(() => {})
  }, [])

  if (!streak || streak.currentStreak === 0) return null

  const flames = streak.currentStreak >= 30 ? '🔥🔥🔥'
    : streak.currentStreak >= 7 ? '🔥🔥'
    : '🔥'

  return (
    <div className="flex items-center gap-1.5 bg-orange-50 border border-orange-100 rounded-xl px-3 py-1.5">
      <span className="text-sm">{flames}</span>
      <div>
        <span className="text-sm font-bold text-orange-600">{streak.currentStreak}</span>
        <span className="text-xs text-orange-400 ml-1">day streak</span>
      </div>
      {streak.freezeTokens > 0 && (
        <span className="ml-1 text-xs text-slate-400" title="Freeze tokens">
          🧊×{streak.freezeTokens}
        </span>
      )}
    </div>
  )
}
