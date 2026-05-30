// CoinGecko free API — no key required, 30 req/min
const BASE = 'https://api.coingecko.com/api/v3'

export interface CoinSearchResult {
  id: string           // coingecko id e.g. 'bitcoin'
  name: string         // 'Bitcoin'
  symbol: string       // 'BTC'
  thumb: string        // small logo url
  market_cap_rank: number | null
}

export interface CoinPrice {
  id: string
  symbol: string
  name: string
  gbp: number
  usd: number
  gbp_24h_change: number
}

// Search coins by name or symbol
export async function searchCoins(query: string): Promise<CoinSearchResult[]> {
  const res = await fetch(
    `${BASE}/search?query=${encodeURIComponent(query)}`,
    { next: { revalidate: 300 } }  // cache 5 min
  )
  if (!res.ok) return []
  const data = await res.json()
  return (data.coins as CoinSearchResult[]).slice(0, 8)
}

// Get live GBP price for one or more coin ids
export async function getCoinPrices(coinIds: string[]): Promise<CoinPrice[]> {
  if (coinIds.length === 0) return []
  const ids = coinIds.join(',')
  const res = await fetch(
    `${BASE}/simple/price?ids=${ids}&vs_currencies=gbp,usd&include_24hr_change=true`,
    { next: { revalidate: 60 } }  // cache 1 min
  )
  if (!res.ok) return []
  const data = await res.json()

  return coinIds.map(id => ({
    id,
    symbol: id,
    name: id,
    gbp: data[id]?.gbp ?? 0,
    usd: data[id]?.usd ?? 0,
    gbp_24h_change: data[id]?.gbp_24h_change ?? 0,
  }))
}

// Get price for a single coin — returns GBP value
export async function getCoinPriceGBP(coinId: string): Promise<number> {
  const prices = await getCoinPrices([coinId])
  return prices[0]?.gbp ?? 0
}
