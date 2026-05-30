import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockAuth = vi.fn()
const mockRecordCheckin = vi.fn()
const mockGetStreak = vi.fn()

vi.mock('@/lib/auth', () => ({ auth: mockAuth }))
vi.mock('@/lib/streaks', () => ({
  recordCheckin: mockRecordCheckin,
  getStreak: mockGetStreak,
}))

const SESSION = { user: { id: 'user-1' } }

const STREAK_DATA = {
  currentStreak: 7,
  longestStreak: 14,
  lastCheckinDate: '2025-06-15',
  freezeTokens: 1,
  totalCheckins: 42,
  checkedInToday: true,
  milestoneReached: 7,
}

describe('GET /api/streaks', () => {
  beforeEach(() => {
    vi.resetModules()
    mockAuth.mockResolvedValue(SESSION)
  })

  it('returns 401 when not authenticated', async () => {
    mockAuth.mockResolvedValueOnce(null)
    const { GET } = await import('@/app/api/streaks/route')
    const res = await GET()
    expect(res.status).toBe(401)
  })

  it('returns streak data without recording check-in', async () => {
    mockGetStreak.mockResolvedValue(STREAK_DATA)
    const { GET } = await import('@/app/api/streaks/route')
    const res = await GET()
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.streak.currentStreak).toBe(7)
    expect(mockRecordCheckin).not.toHaveBeenCalled()
  })

  it('returns zero streak for new user', async () => {
    mockGetStreak.mockResolvedValue({
      currentStreak: 0, longestStreak: 0, lastCheckinDate: null,
      freezeTokens: 0, totalCheckins: 0, checkedInToday: false, milestoneReached: null,
    })
    const { GET } = await import('@/app/api/streaks/route')
    const res = await GET()
    const body = await res.json()
    expect(body.streak.currentStreak).toBe(0)
  })
})

describe('POST /api/streaks', () => {
  beforeEach(() => {
    vi.resetModules()
    mockAuth.mockResolvedValue(SESSION)
  })

  it('returns 401 when not authenticated', async () => {
    mockAuth.mockResolvedValueOnce(null)
    const { POST } = await import('@/app/api/streaks/route')
    const res = await POST()
    expect(res.status).toBe(401)
  })

  it('records check-in and returns updated streak', async () => {
    mockRecordCheckin.mockResolvedValue(STREAK_DATA)
    const { POST } = await import('@/app/api/streaks/route')
    const res = await POST()
    expect(res.status).toBe(200)
    expect(mockRecordCheckin).toHaveBeenCalledWith('user-1')
    const body = await res.json()
    expect(body.streak.currentStreak).toBe(7)
    expect(body.streak.milestoneReached).toBe(7)
  })

  it('returns streak with freeze token count', async () => {
    mockRecordCheckin.mockResolvedValue({ ...STREAK_DATA, freezeTokens: 2 })
    const { POST } = await import('@/app/api/streaks/route')
    const res = await POST()
    const body = await res.json()
    expect(body.streak.freezeTokens).toBe(2)
  })
})
