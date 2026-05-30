import { describe, it, expect, vi } from 'vitest'

vi.mock('@/lib/db', () => ({ db: { execute: vi.fn(), batch: vi.fn() } }))
vi.mock('@/lib/push', () => ({ saveInAppNotification: vi.fn() }))
vi.mock('@/lib/missions', () => ({ awardXP: vi.fn() }))

import { TROPHY_DEFS } from '@/lib/trophies'

describe('TROPHY_DEFS', () => {
  it('contains at least 20 trophies', () => {
    expect(TROPHY_DEFS.length).toBeGreaterThanOrEqual(20)
  })

  it('every trophy has required fields', () => {
    TROPHY_DEFS.forEach(t => {
      expect(t.id, `${t.id} missing id`).toBeTruthy()
      expect(t.title, `${t.id} missing title`).toBeTruthy()
      expect(t.description, `${t.id} missing description`).toBeTruthy()
      expect(t.icon, `${t.id} missing icon`).toBeTruthy()
      expect(t.xp, `${t.id} missing xp`).toBeGreaterThan(0)
      expect(t.category, `${t.id} missing category`).toBeTruthy()
    })
  })

  it('all trophy ids are unique', () => {
    const ids = TROPHY_DEFS.map(t => t.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('covers all required categories', () => {
    const categories = new Set(TROPHY_DEFS.map(t => t.category))
    ;['wealth', 'score', 'goals', 'debt', 'renewals', 'streaks', 'missions'].forEach(cat => {
      expect(categories.has(cat as typeof TROPHY_DEFS[0]['category']), `Missing category: ${cat}`).toBe(true)
    })
  })

  it('XP values scale reasonably (10–1000)', () => {
    TROPHY_DEFS.forEach(t => {
      expect(t.xp).toBeGreaterThanOrEqual(10)
      expect(t.xp).toBeLessThanOrEqual(1000)
    })
  })

  it('wealth milestones are in ascending order', () => {
    const milestones = TROPHY_DEFS.filter(t =>
      t.id.startsWith('net_worth_')
    ).map(t => t.xp)
    for (let i = 1; i < milestones.length; i++) {
      expect(milestones[i]).toBeGreaterThan(milestones[i - 1])
    }
  })

  it('vault score trophies are in ascending order', () => {
    const scoreTrophies = ['vault_300', 'vault_450', 'vault_600', 'vault_750']
    const xpValues = scoreTrophies.map(id => TROPHY_DEFS.find(t => t.id === id)?.xp ?? 0)
    for (let i = 1; i < xpValues.length; i++) {
      expect(xpValues[i]).toBeGreaterThan(xpValues[i - 1])
    }
  })

  it('streak trophies exist for 3, 7, and 30 days', () => {
    const ids = new Set(TROPHY_DEFS.map(t => t.id))
    expect(ids.has('streak_3')).toBe(true)
    expect(ids.has('streak_7')).toBe(true)
    expect(ids.has('streak_30')).toBe(true)
  })

  it('first asset trophy exists', () => {
    expect(TROPHY_DEFS.some(t => t.id === 'first_asset')).toBe(true)
  })

  it('secret trophies are marked correctly', () => {
    const secret = TROPHY_DEFS.filter(t => t.secret === true)
    expect(secret.length).toBeGreaterThan(0)
    // Secret trophies should generally have higher XP
    const secretAvgXp = secret.reduce((s, t) => s + t.xp, 0) / secret.length
    const publicAvgXp = TROPHY_DEFS.filter(t => !t.secret).reduce((s, t) => s + t.xp, 0) /
      TROPHY_DEFS.filter(t => !t.secret).length
    expect(secretAvgXp).toBeGreaterThan(publicAvgXp)
  })
})
