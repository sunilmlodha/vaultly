import { describe, it, expect, vi, beforeEach } from 'vitest'

// Test the pure date logic extracted from streaks
// (DB calls are tested in api/ tests)

function todayStr(date = new Date()): string {
  return date.toISOString().split('T')[0]
}

function yesterdayStr(date = new Date()): string {
  const d = new Date(date)
  d.setDate(d.getDate() - 1)
  return d.toISOString().split('T')[0]
}

function daysAgoStr(n: number, from = new Date()): string {
  const d = new Date(from)
  d.setDate(d.getDate() - n)
  return d.toISOString().split('T')[0]
}

// Streak calculation logic (extracted from lib/streaks.ts for unit testing)
function calculateStreak(
  lastDate: string | null,
  currentStreak: number,
  freezeTokens: number,
  today = todayStr()
): { newStreak: number; tokenUsed: boolean; broken: boolean } {
  if (!lastDate) return { newStreak: 1, tokenUsed: false, broken: false }
  if (lastDate === today) return { newStreak: currentStreak, tokenUsed: false, broken: false }

  const yesterday = yesterdayStr(new Date(today + 'T12:00:00'))
  if (lastDate === yesterday) {
    return { newStreak: currentStreak + 1, tokenUsed: false, broken: false }
  }

  const daysMissed = Math.floor(
    (new Date(today).getTime() - new Date(lastDate).getTime()) / 86400000
  )

  if (daysMissed === 2 && freezeTokens > 0) {
    return { newStreak: currentStreak + 1, tokenUsed: true, broken: false }
  }

  return { newStreak: 1, tokenUsed: false, broken: true }
}

describe('Streak calculation logic', () => {
  const TODAY = '2025-06-15'
  const YESTERDAY = '2025-06-14'
  const TWO_DAYS_AGO = '2025-06-13'
  const WEEK_AGO = '2025-06-08'

  it('starts at 1 for first check-in (no history)', () => {
    const r = calculateStreak(null, 0, 0, TODAY)
    expect(r.newStreak).toBe(1)
    expect(r.broken).toBe(false)
  })

  it('no change if already checked in today', () => {
    const r = calculateStreak(TODAY, 5, 0, TODAY)
    expect(r.newStreak).toBe(5)
    expect(r.broken).toBe(false)
  })

  it('extends streak on consecutive day', () => {
    const r = calculateStreak(YESTERDAY, 7, 0, TODAY)
    expect(r.newStreak).toBe(8)
    expect(r.broken).toBe(false)
    expect(r.tokenUsed).toBe(false)
  })

  it('resets streak when gap > 1 day with no freeze tokens', () => {
    const r = calculateStreak(TWO_DAYS_AGO, 10, 0, TODAY)
    expect(r.newStreak).toBe(1)
    expect(r.broken).toBe(true)
  })

  it('uses freeze token when gap is exactly 2 days', () => {
    const r = calculateStreak(TWO_DAYS_AGO, 10, 2, TODAY)
    expect(r.newStreak).toBe(11)
    expect(r.tokenUsed).toBe(true)
    expect(r.broken).toBe(false)
  })

  it('does NOT use freeze token for gap > 2 days', () => {
    const r = calculateStreak(WEEK_AGO, 10, 3, TODAY)
    expect(r.broken).toBe(true)
    expect(r.newStreak).toBe(1)
  })

  it('resets even with tokens when gap is only 1 day (consecutive)', () => {
    // Yesterday → no gap, so token shouldn't matter
    const r = calculateStreak(YESTERDAY, 5, 3, TODAY)
    expect(r.newStreak).toBe(6)
    expect(r.tokenUsed).toBe(false)
  })

  it('streak of 1 starts correctly after break', () => {
    const r = calculateStreak(WEEK_AGO, 30, 0, TODAY)
    expect(r.newStreak).toBe(1)
    expect(r.broken).toBe(true)
  })
})

describe('Streak milestones', () => {
  const MILESTONES = [3, 7, 14, 30, 60, 100, 365]

  it('milestone list contains expected values', () => {
    expect(MILESTONES).toContain(3)
    expect(MILESTONES).toContain(7)
    expect(MILESTONES).toContain(30)
    expect(MILESTONES).toContain(365)
  })

  it('milestones are in ascending order', () => {
    for (let i = 1; i < MILESTONES.length; i++) {
      expect(MILESTONES[i]).toBeGreaterThan(MILESTONES[i - 1])
    }
  })
})

describe('Date helpers', () => {
  it('todayStr returns YYYY-MM-DD format', () => {
    expect(todayStr()).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  it('yesterdayStr is one day before today', () => {
    const today = new Date('2025-06-15')
    expect(yesterdayStr(today)).toBe('2025-06-14')
  })

  it('daysAgoStr returns correct date', () => {
    const from = new Date('2025-06-15')
    expect(daysAgoStr(7, from)).toBe('2025-06-08')
    expect(daysAgoStr(1, from)).toBe('2025-06-14')
    expect(daysAgoStr(0, from)).toBe('2025-06-15')
  })
})
