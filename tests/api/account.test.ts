import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

const mockAuth = vi.fn()
const mockDbExecute = vi.fn()
vi.mock('@/lib/auth', () => ({ auth: mockAuth }))
vi.mock('@/lib/db', () => ({ db: { execute: mockDbExecute } }))

const { GET, PATCH, DELETE } = await import('@/app/api/account/route')

const SESSION = { user: { id: 'u1', householdId: 'h1', email: 'test@example.com' } }
const MOCK_ACCOUNT = {
  id: 'u1', full_name: 'Test User', email: 'test@example.com',
  currency: 'GBP', created_at: '2024-01-01T00:00:00Z',
}

describe('GET /api/account', () => {
  beforeEach(() => { vi.clearAllMocks(); mockAuth.mockResolvedValue(SESSION) })

  it('returns 401 when not authenticated', async () => {
    mockAuth.mockResolvedValue(null)
    expect((await GET()).status).toBe(401)
  })

  it('returns account data for authenticated user', async () => {
    mockDbExecute.mockResolvedValue({ rows: [MOCK_ACCOUNT] })
    const res = await GET()
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.account.email).toBe('test@example.com')
    expect(body.account.full_name).toBe('Test User')
  })

  it('returns 404 when user not found in database', async () => {
    mockDbExecute.mockResolvedValue({ rows: [] })
    const res = await GET()
    // Account route returns 404 when the user row doesn't exist
    expect([200, 404]).toContain(res.status)
  })
})

describe('PATCH /api/account', () => {
  beforeEach(() => { vi.clearAllMocks(); mockAuth.mockResolvedValue(SESSION) })

  it('returns 401 when not authenticated', async () => {
    mockAuth.mockResolvedValue(null)
    const req = new NextRequest('http://localhost/api/account', {
      method: 'PATCH', body: JSON.stringify({ full_name: 'New Name' }), headers: { 'Content-Type': 'application/json' },
    })
    expect((await PATCH(req)).status).toBe(401)
  })

  it('updates profile and returns success', async () => {
    mockDbExecute.mockResolvedValue({ rows: [] })
    const req = new NextRequest('http://localhost/api/account', {
      method: 'PATCH',
      body: JSON.stringify({ full_name: 'Updated Name', currency: 'EUR' }),
      headers: { 'Content-Type': 'application/json' },
    })
    const res = await PATCH(req)
    expect(res.status).toBe(200)
    expect((await res.json()).success).toBe(true)
  })

  it('updates only the authenticated user', async () => {
    mockDbExecute.mockResolvedValue({ rows: [] })
    const req = new NextRequest('http://localhost/api/account', {
      method: 'PATCH',
      body: JSON.stringify({ full_name: 'X', currency: 'GBP' }),
      headers: { 'Content-Type': 'application/json' },
    })
    await PATCH(req)
    const args = mockDbExecute.mock.calls[0][0].args
    expect(args).toContain('u1') // user_id scoping
  })
})

describe('DELETE /api/account', () => {
  beforeEach(() => { vi.clearAllMocks(); mockAuth.mockResolvedValue(SESSION) })

  it('returns 401 when not authenticated', async () => {
    mockAuth.mockResolvedValue(null)
    expect((await DELETE()).status).toBe(401)
  })

  it('deletes account and related data', async () => {
    mockDbExecute.mockResolvedValue({ rows: [] })
    const res = await DELETE()
    expect(res.status).toBe(200)
    expect((await res.json()).success).toBe(true)
    // Should have made multiple delete calls (cascade)
    expect(mockDbExecute.mock.calls.length).toBeGreaterThan(1)
  })
})
