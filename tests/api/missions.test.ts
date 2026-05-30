import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockAuth = vi.fn()
const mockDbExecute = vi.fn()
const mockGetMissions = vi.fn()

vi.mock('@/lib/auth', () => ({ auth: mockAuth }))
vi.mock('@/lib/db', () => ({ db: { execute: mockDbExecute } }))
vi.mock('@/lib/missions', () => ({
  getMissionsWithProgress: mockGetMissions,
  xpToNextLevel: (xp: number) => ({ level: Math.floor(xp / 100) + 1, xpInLevel: xp % 100, xpNeeded: 100, pct: xp % 100 }),
}))

const SESSION = { user: { id: 'user-1', householdId: 'hh-1' } }

const MISSIONS = [
  { id: 'add_asset', title: 'Asset Hunter', icon: '💰', xp: 15, type: 'weekly', target: 1, progress: 0, pct: 0, completed: false, daysLeft: 5 },
  { id: 'check_vault_score', title: 'Score Check', icon: '🏆', xp: 10, type: 'weekly', target: 1, progress: 1, pct: 100, completed: true, daysLeft: 5 },
  { id: 'monthly_score_gain', title: 'Vault Guardian', icon: '⚡', xp: 75, type: 'monthly', target: 30, progress: 15, pct: 50, completed: false, daysLeft: 20 },
]

describe('GET /api/missions', () => {
  beforeEach(() => {
    vi.resetModules()
    mockAuth.mockResolvedValue(SESSION)
    mockDbExecute.mockResolvedValue({ rows: [{ total_xp: 250, level: 3 }] })
  })

  it('returns 401 when not authenticated', async () => {
    mockAuth.mockResolvedValueOnce(null)
    const { GET } = await import('@/app/api/missions/route')
    const res = await GET()
    expect(res.status).toBe(401)
  })

  it('returns 400 when no householdId', async () => {
    mockAuth.mockResolvedValueOnce({ user: { id: 'user-1' } })
    const { GET } = await import('@/app/api/missions/route')
    const res = await GET()
    expect(res.status).toBe(400)
  })

  it('returns missions array', async () => {
    mockGetMissions.mockResolvedValue(MISSIONS)
    const { GET } = await import('@/app/api/missions/route')
    const res = await GET()
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.missions).toHaveLength(3)
  })

  it('returns XP level info', async () => {
    mockGetMissions.mockResolvedValue(MISSIONS)
    const { GET } = await import('@/app/api/missions/route')
    const res = await GET()
    const body = await res.json()
    expect(body.xp.total).toBe(250)
    expect(body.xp.level).toBe(3)
  })

  it('shows completed missions', async () => {
    mockGetMissions.mockResolvedValue(MISSIONS)
    const { GET } = await import('@/app/api/missions/route')
    const res = await GET()
    const body = await res.json()
    const completed = body.missions.filter((m: { completed: boolean }) => m.completed)
    expect(completed.length).toBe(1)
  })

  it('includes both weekly and monthly missions', async () => {
    mockGetMissions.mockResolvedValue(MISSIONS)
    const { GET } = await import('@/app/api/missions/route')
    const res = await GET()
    const body = await res.json()
    const types = new Set(body.missions.map((m: { type: string }) => m.type))
    expect(types.has('weekly')).toBe(true)
    expect(types.has('monthly')).toBe(true)
  })
})
