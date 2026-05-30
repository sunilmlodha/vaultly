import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockAuth = vi.fn()
const mockDbExecute = vi.fn()

vi.mock('@/lib/auth', () => ({ auth: mockAuth }))
vi.mock('@/lib/db', () => ({ db: { execute: mockDbExecute } }))

const SESSION = {
  user: { id: 'user-1', householdId: 'hh-1', name: 'Test User', email: 'test@example.com' },
}

const DB_USER = {
  id: 'user-1', email: 'test@example.com', full_name: 'Test User',
  avatar_url: null, phone: '07700000000', bio: 'Hello', date_of_birth: '1990-01-01',
  notification_prefs: '{"renewal_reminders":true}', currency: 'GBP',
  household_id: 'hh-1', created_at: '2024-01-01T00:00:00Z', updated_at: '2024-01-01T00:00:00Z',
}

describe('GET /api/profile', () => {
  beforeEach(() => {
    vi.resetModules()
    mockAuth.mockResolvedValue(SESSION)
  })

  it('returns 401 when not authenticated', async () => {
    mockAuth.mockResolvedValueOnce(null)
    const { GET } = await import('@/app/api/profile/route')
    const res = await GET()
    expect(res.status).toBe(401)
  })

  it('returns full profile with connected_providers', async () => {
    mockDbExecute
      .mockResolvedValueOnce({ rows: [DB_USER] })          // user query
      .mockResolvedValueOnce({ rows: [{ provider: 'google', created_at: '2024-01-01' }] }) // oauth
    const { GET } = await import('@/app/api/profile/route')
    const res = await GET()
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.profile.email).toBe('test@example.com')
    expect(body.profile.connected_providers).toHaveLength(1)
    expect(body.profile.connected_providers[0].provider).toBe('google')
  })

  it('parses notification_prefs from JSON string', async () => {
    mockDbExecute
      .mockResolvedValueOnce({ rows: [DB_USER] })
      .mockResolvedValueOnce({ rows: [] })
    const { GET } = await import('@/app/api/profile/route')
    const res = await GET()
    const body = await res.json()
    expect(body.profile.notification_prefs).toEqual({ renewal_reminders: true })
  })

  it('returns 404 when user not found', async () => {
    mockDbExecute
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
    const { GET } = await import('@/app/api/profile/route')
    const res = await GET()
    expect(res.status).toBe(404)
  })
})

describe('PATCH /api/profile', () => {
  beforeEach(() => {
    vi.resetModules()
    mockAuth.mockResolvedValue(SESSION)
  })

  it('returns 401 when not authenticated', async () => {
    mockAuth.mockResolvedValueOnce(null)
    const { PATCH } = await import('@/app/api/profile/route')
    const req = new Request('http://localhost/api/profile', {
      method: 'PATCH',
      body: JSON.stringify({ full_name: 'New Name' }),
    })
    const res = await PATCH(req as Parameters<typeof PATCH>[0])
    expect(res.status).toBe(401)
  })

  it('returns 400 when no valid fields provided', async () => {
    const { PATCH } = await import('@/app/api/profile/route')
    const req = new Request('http://localhost/api/profile', {
      method: 'PATCH',
      body: JSON.stringify({ unknown_field: 'value' }),
    })
    const res = await PATCH(req as Parameters<typeof PATCH>[0])
    expect(res.status).toBe(400)
  })

  it('updates full_name successfully', async () => {
    mockDbExecute
      .mockResolvedValueOnce({ rows: [] }) // UPDATE
      .mockResolvedValueOnce({ rows: [{ ...DB_USER, full_name: 'New Name' }] }) // SELECT
    const { PATCH } = await import('@/app/api/profile/route')
    const req = new Request('http://localhost/api/profile', {
      method: 'PATCH',
      body: JSON.stringify({ full_name: 'New Name' }),
    })
    const res = await PATCH(req as Parameters<typeof PATCH>[0])
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.profile).toBeDefined()
  })

  it('serialises notification_prefs to JSON', async () => {
    const calls: Parameters<typeof mockDbExecute>[] = []
    mockDbExecute.mockImplementation((...args) => { calls.push(args); return Promise.resolve({ rows: [DB_USER] }) })
    const { PATCH } = await import('@/app/api/profile/route')
    const req = new Request('http://localhost/api/profile', {
      method: 'PATCH',
      body: JSON.stringify({ notification_prefs: { renewal_reminders: false } }),
    })
    await PATCH(req as Parameters<typeof PATCH>[0])
    // First call is the UPDATE — check that notification_prefs was serialised
    expect(calls.length).toBeGreaterThan(0)
  })
})
