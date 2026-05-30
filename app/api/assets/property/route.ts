import { NextRequest, NextResponse } from 'next/server'
import { lookupProperty, estimateForSale } from '@/lib/property-lookup'
import type { PropertySale } from '@/lib/property-lookup'

// GET /api/assets/property?postcode=SL3+7RQ
export async function GET(req: NextRequest) {
  const postcode = new URL(req.url).searchParams.get('postcode')
  if (!postcode) return NextResponse.json({ error: 'postcode required' }, { status: 400 })
  const result = await lookupProperty(postcode)
  return NextResponse.json(result)
}

// POST /api/assets/property/select — recalculate estimate when user picks a different property
export async function POST(req: NextRequest) {
  const { sale, postcode } = await req.json() as { sale: PropertySale; postcode: string }
  if (!sale || !postcode) return NextResponse.json({ error: 'sale and postcode required' }, { status: 400 })
  const est = estimateForSale(sale, postcode)
  return NextResponse.json({ selectedSale: sale, ...est })
}
