import { NextRequest, NextResponse } from 'next/server'
import { searchCoins, getCoinPrices } from '@/lib/crypto-prices'

// GET /api/assets/crypto-price?q=bitcoin — search coins
// GET /api/assets/crypto-price?ids=bitcoin,ethereum — get prices
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const q = searchParams.get('q')
  const ids = searchParams.get('ids')

  if (q) {
    const results = await searchCoins(q)
    return NextResponse.json({ results })
  }

  if (ids) {
    const coinIds = ids.split(',').filter(Boolean)
    const prices = await getCoinPrices(coinIds)
    return NextResponse.json({ prices })
  }

  return NextResponse.json({ error: 'Provide q= or ids= param' }, { status: 400 })
}
