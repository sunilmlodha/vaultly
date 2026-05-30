import { describe, it, expect, vi } from 'vitest'

vi.mock('@/lib/db', () => ({ db: { execute: vi.fn(), batch: vi.fn() } }))
vi.mock('@/lib/push', () => ({ saveInAppNotification: vi.fn() }))

import { scoreLabel } from '@/lib/vault-score'
import { xpToNextLevel } from '@/lib/missions'

describe('scoreLabel()', () => {
  it('returns Excellent for 750+', () => {
    expect(scoreLabel(750).label).toBe('Excellent')
    expect(scoreLabel(850).label).toBe('Excellent')
    expect(scoreLabel(750).colour).toContain('emerald')
  })

  it('returns Great for 600–749', () => {
    expect(scoreLabel(600).label).toBe('Great')
    expect(scoreLabel(749).label).toBe('Great')
    expect(scoreLabel(600).colour).toContain('green')
  })

  it('returns Good for 450–599', () => {
    expect(scoreLabel(450).label).toBe('Good')
    expect(scoreLabel(599).label).toBe('Good')
    expect(scoreLabel(450).colour).toContain('indigo')
  })

  it('returns Building for 300–449', () => {
    expect(scoreLabel(300).label).toBe('Building')
    expect(scoreLabel(449).label).toBe('Building')
    expect(scoreLabel(300).colour).toContain('amber')
  })

  it('returns Starting for below 300', () => {
    expect(scoreLabel(0).label).toBe('Starting')
    expect(scoreLabel(299).label).toBe('Starting')
    expect(scoreLabel(0).colour).toContain('slate')
  })

  it('always returns a label and colour', () => {
    for (const s of [0, 100, 200, 300, 400, 500, 600, 700, 800, 850]) {
      const { label, colour } = scoreLabel(s)
      expect(label.length).toBeGreaterThan(0)
      expect(colour.length).toBeGreaterThan(0)
    }
  })
})

describe('xpToNextLevel()', () => {
  it('starts at level 1 with 0 XP', () => {
    const r = xpToNextLevel(0)
    expect(r.level).toBe(1)
    expect(r.xpInLevel).toBe(0)
    expect(r.pct).toBe(0)
  })

  it('levels up every 100 XP', () => {
    expect(xpToNextLevel(100).level).toBe(2)
    expect(xpToNextLevel(200).level).toBe(3)
    expect(xpToNextLevel(500).level).toBe(6)
  })

  it('calculates XP within level correctly', () => {
    const r = xpToNextLevel(150)
    expect(r.level).toBe(2)
    expect(r.xpInLevel).toBe(50)
    expect(r.xpNeeded).toBe(100)
    expect(r.pct).toBe(50)
  })

  it('pct is 0–100', () => {
    for (const xp of [0, 50, 99, 100, 199, 1000]) {
      const { pct } = xpToNextLevel(xp)
      expect(pct).toBeGreaterThanOrEqual(0)
      expect(pct).toBeLessThanOrEqual(100)
    }
  })

  it('never returns negative level', () => {
    expect(xpToNextLevel(0).level).toBeGreaterThanOrEqual(1)
  })
})
