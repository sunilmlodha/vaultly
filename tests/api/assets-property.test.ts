import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockLookup = vi.fn()

vi.mock('@/lib/property-lookup', () => ({ lookupProperty: mockLookup }))

const PROPERTY_RESULT = {
  lastSale: {
    address: '10 Downing Street, London',
    postcode: 'SW1A 2AA',
    price: 850000,
    date: '2021-03-15',
    propertyType: 'Terraced',
  },
  estimatedValue: 980000,
  yearsSinceSale: 4.2,
  annualGrowthPct: 3.8,
  confidence: 'medium',
  disclaimer: 'Estimated using 3.8% regional annual growth (ONS HPI).',
}

describe('GET /api/assets/property', () => {
  beforeEach(() => {
    vi.resetModules()
    mockLookup.mockResolvedValue(PROPERTY_RESULT)
  })

  it('returns 400 when postcode not provided', async () => {
    const { GET } = await import('@/app/api/assets/property/route')
    const req = new Request('http://localhost/api/assets/property')
    const res = await GET(req as Parameters<typeof GET>[0])
    expect(res.status).toBe(400)
  })

  it('calls lookupProperty with the postcode', async () => {
    const { GET } = await import('@/app/api/assets/property/route')
    const req = new Request('http://localhost/api/assets/property?postcode=SW1A+2AA')
    const res = await GET(req as Parameters<typeof GET>[0])
    expect(mockLookup).toHaveBeenCalledWith('SW1A 2AA')
    expect(res.status).toBe(200)
  })

  it('returns last sale data', async () => {
    const { GET } = await import('@/app/api/assets/property/route')
    const req = new Request('http://localhost/api/assets/property?postcode=SW1A+2AA')
    const res = await GET(req as Parameters<typeof GET>[0])
    const body = await res.json()
    expect(body.lastSale.price).toBe(850000)
    expect(body.lastSale.propertyType).toBe('Terraced')
  })

  it('returns estimated value', async () => {
    const { GET } = await import('@/app/api/assets/property/route')
    const req = new Request('http://localhost/api/assets/property?postcode=SW1A+2AA')
    const res = await GET(req as Parameters<typeof GET>[0])
    const body = await res.json()
    expect(body.estimatedValue).toBe(980000)
    expect(body.confidence).toBe('medium')
  })

  it('returns null lastSale for unknown postcode', async () => {
    mockLookup.mockResolvedValueOnce({ lastSale: null, estimatedValue: null, confidence: 'low', disclaimer: 'No data found.' })
    const { GET } = await import('@/app/api/assets/property/route')
    const req = new Request('http://localhost/api/assets/property?postcode=ZZ1+1ZZ')
    const res = await GET(req as Parameters<typeof GET>[0])
    const body = await res.json()
    expect(body.lastSale).toBeNull()
    expect(body.estimatedValue).toBeNull()
  })

  it('includes disclaimer in response', async () => {
    const { GET } = await import('@/app/api/assets/property/route')
    const req = new Request('http://localhost/api/assets/property?postcode=SW1A+2AA')
    const res = await GET(req as Parameters<typeof GET>[0])
    const body = await res.json()
    expect(body.disclaimer).toBeTruthy()
    expect(typeof body.disclaimer).toBe('string')
  })
})
