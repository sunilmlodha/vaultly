import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockSearchCoins = vi.fn()
const mockGetPrices = vi.fn()

vi.mock('@/lib/crypto-prices', () => ({
  searchCoins: mockSearchCoins,
  getCoinPrices: mockGetPrices,
}))

const COIN_RESULTS = [
  { id: 'bitcoin', name: 'Bitcoin', symbol: 'btc', thumb: 'https://assets.coingecko.com/coins/images/1/thumb/bitcoin.png' },
  { id: 'ethereum', name: 'Ethereum', symbol: 'eth', thumb: 'https://assets.coingecko.com/coins/images/279/thumb/ethereum.png' },
]

const PRICE_RESULTS = [
  { id: 'bitcoin', symbol: 'btc', name: 'Bitcoin', gbp: 52000, usd: 65000, gbp_24h_change: 2.3 },
]

describe('GET /api/assets/crypto-price', () => {
  beforeEach(() => {
    vi.resetModules()
    mockSearchCoins.mockResolvedValue(COIN_RESULTS)
    mockGetPrices.mockResolvedValue(PRICE_RESULTS)
  })

  it('searches coins when q param provided', async () => {
    const { GET } = await import('@/app/api/assets/crypto-price/route')
    const req = new Request('http://localhost/api/assets/crypto-price?q=bitcoin')
    const res = await GET(req as Parameters<typeof GET>[0])
    expect(res.status).toBe(200)
    expect(mockSearchCoins).toHaveBeenCalledWith('bitcoin')
    const body = await res.json()
    expect(body.results).toHaveLength(2)
    expect(body.results[0].id).toBe('bitcoin')
  })

  it('gets prices when ids param provided', async () => {
    const { GET } = await import('@/app/api/assets/crypto-price/route')
    const req = new Request('http://localhost/api/assets/crypto-price?ids=bitcoin')
    const res = await GET(req as Parameters<typeof GET>[0])
    expect(res.status).toBe(200)
    expect(mockGetPrices).toHaveBeenCalledWith(['bitcoin'])
    const body = await res.json()
    expect(body.prices[0].gbp).toBe(52000)
  })

  it('handles multiple coin ids', async () => {
    mockGetPrices.mockResolvedValue([...PRICE_RESULTS, { id: 'ethereum', gbp: 3200, usd: 4000, gbp_24h_change: -1.2 }])
    const { GET } = await import('@/app/api/assets/crypto-price/route')
    const req = new Request('http://localhost/api/assets/crypto-price?ids=bitcoin,ethereum')
    const res = await GET(req as Parameters<typeof GET>[0])
    expect(mockGetPrices).toHaveBeenCalledWith(['bitcoin', 'ethereum'])
    const body = await res.json()
    expect(body.prices).toHaveLength(2)
  })

  it('returns 400 when neither q nor ids provided', async () => {
    const { GET } = await import('@/app/api/assets/crypto-price/route')
    const req = new Request('http://localhost/api/assets/crypto-price')
    const res = await GET(req as Parameters<typeof GET>[0])
    expect(res.status).toBe(400)
  })

  it('returns empty results when search returns nothing', async () => {
    mockSearchCoins.mockResolvedValue([])
    const { GET } = await import('@/app/api/assets/crypto-price/route')
    const req = new Request('http://localhost/api/assets/crypto-price?q=unknowncoin123')
    const res = await GET(req as Parameters<typeof GET>[0])
    const body = await res.json()
    expect(body.results).toHaveLength(0)
  })
})
