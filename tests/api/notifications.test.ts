import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockAuth = vi.fn()
const mockDbExecute = vi.fn()

vi.mock('@/lib/auth', () => ({ auth: mockAuth }))
vi.mock('@/lib/db', () => ({ db: { execute: mockDbExecute } }))

const SESSION = { user: { id: 'user-1' } }

const NOTIFS = [
  { id: 'n1', type: 'vault_score', title: 'Score up!', body: 'Your score increased', action_url: '/dashboard', read: 0, created_at: '2025-06-15T10:00:00Z' },
  { id: 'n2', type: 'milestone', title: 'Trophy!', body: 'You earned a trophy', action_url: '/achievements', read: 1, created_at: '2025-06-14T09:00:00Z' },
  { id: 'n3', type: 'renewal', title: 'Renewal due', body: 'Insurance due in 7 days', action_url: '/renewals', read: 0, created_at: '2025-06-13T08:00:00Z' },
]

describe('GET /api/notifications', () => {
  beforeEach(() => {
    vi.resetModules()
    mockAuth.mockResolvedValue(SESSION)
  })

  it('returns 401 when not authenticated', async () => {
    mockAuth.mockResolvedValueOnce(null)
    const { GET } = await import('@/app/api/notifications/route')
    const res = await GET()
    expect(res.status).toBe(401)
  })

  it('returns notifications array', async () => {
    mockDbExecute.mockResolvedValueOnce({ rows: NOTIFS })
    const { GET } = await import('@/app/api/notifications/route')
    const res = await GET()
    const body = await res.json()
    expect(body.notifications).toHaveLength(3)
  })

  it('calculates unreadCount correctly', async () => {
    mockDbExecute.mockResolvedValueOnce({ rows: NOTIFS })
    const { GET } = await import('@/app/api/notifications/route')
    const res = await GET()
    const body = await res.json()
    expect(body.unreadCount).toBe(2) // n1 and n3 are unread
  })

  it('returns empty array when no notifications', async () => {
    mockDbExecute.mockResolvedValueOnce({ rows: [] })
    const { GET } = await import('@/app/api/notifications/route')
    const res = await GET()
    const body = await res.json()
    expect(body.notifications).toHaveLength(0)
    expect(body.unreadCount).toBe(0)
  })
})

describe('PATCH /api/notifications', () => {
  beforeEach(() => {
    vi.resetModules()
    mockAuth.mockResolvedValue(SESSION)
    mockDbExecute.mockResolvedValue({ rows: [] })
  })

  it('returns 401 when not authenticated', async () => {
    mockAuth.mockResolvedValueOnce(null)
    const { PATCH } = await import('@/app/api/notifications/route')
    const req = new Request('http://localhost/api/notifications', { method: 'PATCH', body: '{}' })
    const res = await PATCH(req as Parameters<typeof PATCH>[0])
    expect(res.status).toBe(401)
  })

  it('marks all as read when no id provided', async () => {
    const { PATCH } = await import('@/app/api/notifications/route')
    const req = new Request('http://localhost/api/notifications', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    })
    const res = await PATCH(req as Parameters<typeof PATCH>[0])
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
  })

  it('marks single notification as read when id provided', async () => {
    const { PATCH } = await import('@/app/api/notifications/route')
    const req = new Request('http://localhost/api/notifications', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: 'n1' }),
    })
    const res = await PATCH(req as Parameters<typeof PATCH>[0])
    expect(res.status).toBe(200)
  })
})
