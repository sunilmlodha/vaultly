import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockAuth = vi.fn()
const mockDbExecute = vi.fn()
const mockCalcScore = vi.fn()
const mockGetHistory = vi.fn()
const mockSaveNotif = vi.fn()

vi.mock('@/lib/auth', () => ({ auth: mockAuth }))
vi.mock('@/lib/db', () => ({ db: { execute: mockDbExecute } }))
vi.mock('@/lib/vault-score', () => ({
  calculateVaultScore: mockCalcScore,
  getVaultScoreHistory: mockGetHistory,
  scoreLabel: (s: number) => s >= 750 ? { label: 'Excellent', colour: 'text-emerald-600' } : { label: 'Good', colour: 'text-indigo-500' },
}))
vi.mock('@/lib/push', () => ({ saveInAppNotification: mockSaveNotif }))

const SESSION = { user: { id: 'user-1', householdId: 'hh-1' } }

const MOCK_SCORE = {
  score: 620,
  components: { net_worth_momentum: 200, emergency_buffer: 120, goal_velocity: 150, debt_health: 100, renewal_control: 40, engagement: 10 },
  trend: 30,
  label: 'Great',
  colour: 'text-green-500',
  netWorth: 50000,
  previousNetWorth: 48000,
}

describe('GET /api/vault-score', () => {
  beforeEach(() => {
    vi.resetModules()
    mockAuth.mockResolvedValue(SESSION)
    mockSaveNotif.mockResolvedValue(undefined)
  })

  it('returns 401 when not authenticated', async () => {
    mockAuth.mockResolvedValueOnce(null)
    const { GET } = await import('@/app/api/vault-score/route')
    const res = await GET()
    expect(res.status).toBe(401)
  })

  it('returns 400 when no householdId in session', async () => {
    mockAuth.mockResolvedValueOnce({ user: { id: 'user-1' } })
    const { GET } = await import('@/app/api/vault-score/route')
    const res = await GET()
    expect(res.status).toBe(400)
  })

  it('returns cached score when already calculated today', async () => {
    mockDbExecute
      .mockResolvedValueOnce({ rows: [{ score: 620, net_worth_momentum: 200, emergency_buffer: 120, goal_velocity: 150, debt_health: 100, renewal_control: 40, engagement: 10, net_worth_snapshot: 50000 }] }) // today's score
      .mockResolvedValueOnce({ rows: [{ score: 590 }] }) // previous score
    mockGetHistory.mockResolvedValue([])
    const { GET } = await import('@/app/api/vault-score/route')
    const res = await GET()
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.vaultScore.score).toBe(620)
    expect(mockCalcScore).not.toHaveBeenCalled()
  })

  it('calculates fresh score when none today', async () => {
    mockDbExecute.mockResolvedValueOnce({ rows: [] }) // no today score
    mockCalcScore.mockResolvedValue(MOCK_SCORE)
    mockGetHistory.mockResolvedValue([])
    const { GET } = await import('@/app/api/vault-score/route')
    const res = await GET()
    expect(res.status).toBe(200)
    expect(mockCalcScore).toHaveBeenCalledWith('user-1', 'hh-1')
    const body = await res.json()
    expect(body.vaultScore.score).toBe(620)
  })

  it('returns history array', async () => {
    mockDbExecute.mockResolvedValueOnce({ rows: [] })
    mockCalcScore.mockResolvedValue(MOCK_SCORE)
    mockGetHistory.mockResolvedValue([{ score: 590, created_at: '2025-06-01' }, { score: 620, created_at: '2025-06-15' }])
    const { GET } = await import('@/app/api/vault-score/route')
    const res = await GET()
    const body = await res.json()
    expect(Array.isArray(body.history)).toBe(true)
    expect(body.history.length).toBe(2)
  })

  it('fires milestone notification when score crosses 600', async () => {
    mockDbExecute.mockResolvedValueOnce({ rows: [] })
    mockCalcScore.mockResolvedValue({ ...MOCK_SCORE, score: 600, trend: 20 }) // crossed 600
    mockGetHistory.mockResolvedValue([])
    const { GET } = await import('@/app/api/vault-score/route')
    await GET()
    expect(mockSaveNotif).toHaveBeenCalledWith(
      'user-1',
      'milestone',
      expect.stringContaining('600'),
      expect.any(String),
      '/dashboard'
    )
  })
})
