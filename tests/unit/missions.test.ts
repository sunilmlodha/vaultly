import { describe, it, expect, vi } from 'vitest'

vi.mock('@/lib/db', () => ({ db: { execute: vi.fn(), batch: vi.fn() } }))
vi.mock('@/lib/push', () => ({ saveInAppNotification: vi.fn() }))

import { currentPeriod, getActiveMissions, xpToNextLevel } from '@/lib/missions'

describe('currentPeriod()', () => {
  it('returns YYYY-WNN format for weekly', () => {
    const period = currentPeriod('weekly')
    expect(period).toMatch(/^\d{4}-W\d{2}$/)
  })

  it('returns YYYY-MM format for monthly', () => {
    const period = currentPeriod('monthly')
    expect(period).toMatch(/^\d{4}-\d{2}$/)
  })

  it('weekly period matches current year', () => {
    const year = new Date().getFullYear()
    expect(currentPeriod('weekly').startsWith(String(year))).toBe(true)
  })

  it('monthly period matches current year-month', () => {
    const now = new Date()
    const expected = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
    expect(currentPeriod('monthly')).toBe(expected)
  })
})

describe('getActiveMissions()', () => {
  it('returns exactly 6 missions (3 weekly + 3 monthly)', () => {
    const missions = getActiveMissions()
    expect(missions.length).toBe(6)
  })

  it('returns 3 weekly missions', () => {
    const missions = getActiveMissions()
    const weekly = missions.filter(m => m.type === 'weekly')
    expect(weekly.length).toBe(3)
  })

  it('returns 3 monthly missions', () => {
    const missions = getActiveMissions()
    const monthly = missions.filter(m => m.type === 'monthly')
    expect(monthly.length).toBe(3)
  })

  it('all missions have required fields', () => {
    const missions = getActiveMissions()
    missions.forEach(m => {
      expect(m.id).toBeTruthy()
      expect(m.title).toBeTruthy()
      expect(m.description).toBeTruthy()
      expect(m.icon).toBeTruthy()
      expect(m.xp).toBeGreaterThan(0)
      expect(m.target).toBeGreaterThan(0)
      expect(['weekly', 'monthly']).toContain(m.type)
    })
  })

  it('weekly missions are different from each other', () => {
    const missions = getActiveMissions()
    const weekly = missions.filter(m => m.type === 'weekly')
    const ids = weekly.map(m => m.id)
    expect(new Set(ids).size).toBe(3)
  })

  it('XP values are reasonable (10–200)', () => {
    const missions = getActiveMissions()
    missions.forEach(m => {
      expect(m.xp).toBeGreaterThanOrEqual(10)
      expect(m.xp).toBeLessThanOrEqual(200)
    })
  })

  it('missions have tips', () => {
    const missions = getActiveMissions()
    missions.forEach(m => {
      expect(m.tip).toBeTruthy()
    })
  })
})

describe('xpToNextLevel() via missions', () => {
  it('level 1 at 0 XP', () => {
    const r = xpToNextLevel(0)
    expect(r.level).toBe(1)
    expect(r.pct).toBe(0)
  })

  it('level 2 at 100 XP', () => {
    expect(xpToNextLevel(100).level).toBe(2)
    expect(xpToNextLevel(100).xpInLevel).toBe(0)
  })

  it('level 11 at 1000 XP', () => {
    expect(xpToNextLevel(1000).level).toBe(11)
  })

  it('pct is always 0–100', () => {
    [0, 50, 99, 100, 150, 999, 1000].forEach(xp => {
      const { pct } = xpToNextLevel(xp)
      expect(pct).toBeGreaterThanOrEqual(0)
      expect(pct).toBeLessThanOrEqual(100)
    })
  })
})
