/**
 * Assets API route tests
 * db and auth are mocked — no real database or session required.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// ── Mocks ────────────────────────────────────────────────────────────────────
const mockAuth = vi.fn()
const mockDbExecute = vi.fn()

vi.mock('@/lib/auth', () => ({ auth: mockAuth }))
vi.mock('@/lib/db', () => ({ db: { execute: mockDbExecute } }))

// Import after mocks are registered
const { GET, POST, PUT, DELETE } = await import('@/app/api/assets/route')

const SESSION = { user: { id: 'u1', householdId: 'h1', name: 'Test User' } }

const MOCK_ASSET = {
  id: 'a1', user_id: 'u1', household_id: 'h1',
  name: 'Test Asset', category: 'bank_account',
  value: 5000, currency: 'GBP', institution: 'Barclays',
  notes: null, created_at: '2024-01-01T00:00:00Z', updated_at: '2024-01-01T00:00:00Z',
}

function makeRequest(body?: unknown): NextRequest {
  return new NextRequest('http://localhost/api/assets', {
    method: 'POST',
    body: JSON.stringify(body ?? {}),
    headers: { 'Content-Type': 'application/json' },
  })
}

// ── GET /api/assets ───────────────────────────────────────────────────────────
describe('GET /api/assets', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockAuth.mockResolvedValue(SESSION)
  })

  it('returns 401 when not authenticated', async () => {
    mockAuth.mockResolvedValue(null)
    const res = await GET()
    expect(res.status).toBe(401)
    const body = await res.json()
    expect(body.error).toBe('Unauthorized')
  })

  it('returns empty assets array when no assets exist', async () => {
    mockDbExecute.mockResolvedValue({ rows: [] })
    const res = await GET()
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.assets).toEqual([])
  })

  it('returns list of assets for authenticated user', async () => {
    mockDbExecute.mockResolvedValue({ rows: [MOCK_ASSET] })
    const res = await GET()
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.assets).toHaveLength(1)
    expect(body.assets[0].name).toBe('Test Asset')
  })

  it('queries with correct household_id', async () => {
    mockDbExecute.mockResolvedValue({ rows: [] })
    await GET()
    expect(mockDbExecute).toHaveBeenCalledWith(
      expect.objectContaining({ args: ['h1'] })
    )
  })
})

// ── POST /api/assets ──────────────────────────────────────────────────────────
describe('POST /api/assets', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockAuth.mockResolvedValue(SESSION)
  })

  it('returns 401 when not authenticated', async () => {
    mockAuth.mockResolvedValue(null)
    const req = makeRequest({ name: 'ISA', category: 'isa_cash', value: 10000, currency: 'GBP' })
    const res = await POST(req)
    expect(res.status).toBe(401)
  })

  it('creates an asset and returns 201', async () => {
    mockDbExecute
      .mockResolvedValueOnce({ rows: [] })              // INSERT
      .mockResolvedValueOnce({ rows: [MOCK_ASSET] })    // SELECT after insert
    const req = makeRequest({ name: 'Test Asset', category: 'bank_account', value: 5000, currency: 'GBP' })
    const res = await POST(req)
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.asset).toBeDefined()
  })

  it('defaults currency to GBP when not provided', async () => {
    mockDbExecute.mockResolvedValue({ rows: [MOCK_ASSET] })
    const req = makeRequest({ name: 'No Currency', category: 'other', value: 100 })
    await POST(req)
    // Check that db.execute was called with 'GBP' as currency arg
    const insertCall = mockDbExecute.mock.calls[0][0]
    expect(insertCall.args).toContain('GBP')
  })

  it('defaults value to 0 when not provided', async () => {
    mockDbExecute.mockResolvedValue({ rows: [{ ...MOCK_ASSET, value: 0 }] })
    const req = makeRequest({ name: 'No Value', category: 'other' })
    await POST(req)
    const insertCall = mockDbExecute.mock.calls[0][0]
    expect(insertCall.args).toContain(0)
  })
})

// ── PUT /api/assets ───────────────────────────────────────────────────────────
describe('PUT /api/assets', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockAuth.mockResolvedValue(SESSION)
  })

  it('returns 401 when not authenticated', async () => {
    mockAuth.mockResolvedValue(null)
    const req = new NextRequest('http://localhost/api/assets', {
      method: 'PUT',
      body: JSON.stringify({ id: 'a1', name: 'Updated', value: 6000 }),
      headers: { 'Content-Type': 'application/json' },
    })
    const res = await PUT(req)
    expect(res.status).toBe(401)
  })

  it('updates asset and returns success', async () => {
    mockDbExecute.mockResolvedValue({ rows: [] })
    const req = new NextRequest('http://localhost/api/assets', {
      method: 'PUT',
      body: JSON.stringify({ id: 'a1', name: 'Updated Asset', value: 6000 }),
      headers: { 'Content-Type': 'application/json' },
    })
    const res = await PUT(req)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
  })
})

// ── DELETE /api/assets ────────────────────────────────────────────────────────
describe('DELETE /api/assets', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockAuth.mockResolvedValue(SESSION)
  })

  it('returns 401 when not authenticated', async () => {
    mockAuth.mockResolvedValue(null)
    const req = new NextRequest('http://localhost/api/assets', {
      method: 'DELETE',
      body: JSON.stringify({ id: 'a1' }),
      headers: { 'Content-Type': 'application/json' },
    })
    const res = await DELETE(req)
    expect(res.status).toBe(401)
  })

  it('deletes asset and returns success', async () => {
    mockDbExecute.mockResolvedValue({ rows: [] })
    const req = new NextRequest('http://localhost/api/assets', {
      method: 'DELETE',
      body: JSON.stringify({ id: 'a1' }),
      headers: { 'Content-Type': 'application/json' },
    })
    const res = await DELETE(req)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
  })

  it('only deletes assets belonging to the household', async () => {
    mockDbExecute.mockResolvedValue({ rows: [] })
    const req = new NextRequest('http://localhost/api/assets', {
      method: 'DELETE',
      body: JSON.stringify({ id: 'a1' }),
      headers: { 'Content-Type': 'application/json' },
    })
    await DELETE(req)
    const deleteCall = mockDbExecute.mock.calls[0][0]
    // Must include household_id in WHERE clause for security
    expect(deleteCall.sql).toMatch(/household_id/)
    expect(deleteCall.args).toContain('h1')
  })
})
