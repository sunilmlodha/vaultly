import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

const mockAuth = vi.fn()
const mockDbExecute = vi.fn()
vi.mock('@/lib/auth', () => ({ auth: mockAuth }))
vi.mock('@/lib/db', () => ({ db: { execute: mockDbExecute } }))

const { GET, POST, PUT, DELETE } = await import('@/app/api/renewals/route')

const SESSION = { user: { id: 'u1', householdId: 'h1' } }
const MOCK_RENEWAL = {
  id: 'r1', user_id: 'u1', household_id: 'h1',
  name: 'Netflix', category: 'subscription',
  amount: 18, currency: 'GBP',
  renewal_date: '2025-03-01', provider: 'Netflix Inc',
  auto_renews: true, notes: null,
  created_at: '2024-01-01T00:00:00Z', updated_at: '2024-01-01T00:00:00Z',
}

describe('GET /api/renewals', () => {
  beforeEach(() => { vi.clearAllMocks(); mockAuth.mockResolvedValue(SESSION) })

  it('returns 401 when unauthenticated', async () => {
    mockAuth.mockResolvedValue(null)
    expect((await GET()).status).toBe(401)
  })

  it('returns renewals ordered by renewal_date', async () => {
    mockDbExecute.mockResolvedValue({ rows: [MOCK_RENEWAL] })
    const res = await GET()
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.renewals).toHaveLength(1)
  })

  it('query includes ORDER BY renewal_date', async () => {
    mockDbExecute.mockResolvedValue({ rows: [] })
    await GET()
    const sql = mockDbExecute.mock.calls[0][0].sql as string
    expect(sql.toLowerCase()).toMatch(/order by renewal_date/)
  })
})

describe('POST /api/renewals', () => {
  beforeEach(() => { vi.clearAllMocks(); mockAuth.mockResolvedValue(SESSION) })

  it('creates a renewal and returns 201', async () => {
    mockDbExecute.mockResolvedValueOnce({ rows: [] }).mockResolvedValueOnce({ rows: [MOCK_RENEWAL] })
    const req = new NextRequest('http://localhost/api/renewals', {
      method: 'POST',
      body: JSON.stringify({ name: 'Netflix', category: 'subscription', amount: 18, currency: 'GBP', renewal_date: '2025-03-01' }),
      headers: { 'Content-Type': 'application/json' },
    })
    const res = await POST(req)
    expect(res.status).toBe(201)
  })

  it('stores provider as null when not provided', async () => {
    mockDbExecute.mockResolvedValue({ rows: [MOCK_RENEWAL] })
    const req = new NextRequest('http://localhost/api/renewals', {
      method: 'POST',
      body: JSON.stringify({ name: 'Netflix', category: 'subscription', amount: 18, currency: 'GBP', renewal_date: '2025-03-01' }),
      headers: { 'Content-Type': 'application/json' },
    })
    await POST(req)
    const args = mockDbExecute.mock.calls[0][0].args
    expect(args).toContain(null)
  })
})

describe('DELETE /api/renewals', () => {
  beforeEach(() => { vi.clearAllMocks(); mockAuth.mockResolvedValue(SESSION) })

  it('deletes renewal scoped to household', async () => {
    mockDbExecute.mockResolvedValue({ rows: [] })
    const req = new NextRequest('http://localhost/api/renewals', {
      method: 'DELETE',
      body: JSON.stringify({ id: 'r1' }),
      headers: { 'Content-Type': 'application/json' },
    })
    const res = await DELETE(req)
    expect(res.status).toBe(200)
    const sql = mockDbExecute.mock.calls[0][0].sql as string
    expect(sql).toMatch(/household_id/)
  })
})
