import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

const mockAuth = vi.fn()
const mockDbExecute = vi.fn()
vi.mock('@/lib/auth', () => ({ auth: mockAuth }))
vi.mock('@/lib/db', () => ({ db: { execute: mockDbExecute } }))

const { GET, POST, PUT, DELETE } = await import('@/app/api/goals/route')

const SESSION = { user: { id: 'u1', householdId: 'h1' } }
const MOCK_GOAL = {
  id: 'g1', user_id: 'u1', household_id: 'h1',
  name: 'Emergency Fund', category: 'emergency_fund',
  target_amount: 10000, current_amount: 3000,
  currency: 'GBP', target_date: '2025-12-31',
  notes: null, created_at: '2024-01-01T00:00:00Z', updated_at: '2024-01-01T00:00:00Z',
}

describe('GET /api/goals', () => {
  beforeEach(() => { vi.clearAllMocks(); mockAuth.mockResolvedValue(SESSION) })

  it('returns 401 when not authenticated', async () => {
    mockAuth.mockResolvedValue(null)
    const res = await GET()
    expect(res.status).toBe(401)
  })

  it('returns goals list', async () => {
    mockDbExecute.mockResolvedValue({ rows: [MOCK_GOAL] })
    const res = await GET()
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.goals).toHaveLength(1)
    expect(body.goals[0].name).toBe('Emergency Fund')
  })

  it('returns empty array when no goals', async () => {
    mockDbExecute.mockResolvedValue({ rows: [] })
    const res = await GET()
    const body = await res.json()
    expect(body.goals).toEqual([])
  })
})

describe('POST /api/goals', () => {
  beforeEach(() => { vi.clearAllMocks(); mockAuth.mockResolvedValue(SESSION) })

  it('returns 401 when not authenticated', async () => {
    mockAuth.mockResolvedValue(null)
    const req = new NextRequest('http://localhost/api/goals', {
      method: 'POST', body: JSON.stringify({}), headers: { 'Content-Type': 'application/json' },
    })
    expect((await POST(req)).status).toBe(401)
  })

  it('creates a goal and returns 201', async () => {
    mockDbExecute.mockResolvedValueOnce({ rows: [] }).mockResolvedValueOnce({ rows: [MOCK_GOAL] })
    const req = new NextRequest('http://localhost/api/goals', {
      method: 'POST',
      body: JSON.stringify({ name: 'Emergency Fund', category: 'emergency_fund', target_amount: 10000, current_amount: 3000, currency: 'GBP' }),
      headers: { 'Content-Type': 'application/json' },
    })
    const res = await POST(req)
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.goal).toBeDefined()
  })

  it('defaults current_amount to 0', async () => {
    mockDbExecute.mockResolvedValue({ rows: [MOCK_GOAL] })
    const req = new NextRequest('http://localhost/api/goals', {
      method: 'POST',
      body: JSON.stringify({ name: 'New Goal', category: 'savings', target_amount: 5000 }),
      headers: { 'Content-Type': 'application/json' },
    })
    await POST(req)
    const insertArgs = mockDbExecute.mock.calls[0][0].args
    // current_amount should default to 0
    expect(insertArgs).toContain(0)
  })
})

describe('PUT /api/goals', () => {
  beforeEach(() => { vi.clearAllMocks(); mockAuth.mockResolvedValue(SESSION) })

  it('updates goal successfully', async () => {
    mockDbExecute.mockResolvedValue({ rows: [] })
    const req = new NextRequest('http://localhost/api/goals', {
      method: 'PUT',
      body: JSON.stringify({ id: 'g1', name: 'Updated', target_amount: 12000, current_amount: 5000, currency: 'GBP', category: 'savings' }),
      headers: { 'Content-Type': 'application/json' },
    })
    const res = await PUT(req)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
  })

  it('scopes update to household_id', async () => {
    mockDbExecute.mockResolvedValue({ rows: [] })
    const req = new NextRequest('http://localhost/api/goals', {
      method: 'PUT',
      body: JSON.stringify({ id: 'g1', name: 'X', target_amount: 1, current_amount: 0, currency: 'GBP', category: 'other' }),
      headers: { 'Content-Type': 'application/json' },
    })
    await PUT(req)
    const sql = mockDbExecute.mock.calls[0][0].sql as string
    expect(sql).toMatch(/household_id/)
  })
})

describe('DELETE /api/goals', () => {
  beforeEach(() => { vi.clearAllMocks(); mockAuth.mockResolvedValue(SESSION) })

  it('deletes goal and returns success', async () => {
    mockDbExecute.mockResolvedValue({ rows: [] })
    const req = new NextRequest('http://localhost/api/goals', {
      method: 'DELETE',
      body: JSON.stringify({ id: 'g1' }),
      headers: { 'Content-Type': 'application/json' },
    })
    const res = await DELETE(req)
    expect(res.status).toBe(200)
    expect((await res.json()).success).toBe(true)
  })
})
