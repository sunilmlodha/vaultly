import { NextRequest, NextResponse } from 'next/server'
import { lookupProperty } from '@/lib/property-lookup'

// GET /api/assets/property?postcode=SW1A+1AA
export async function GET(req: NextRequest) {
  const postcode = new URL(req.url).searchParams.get('postcode')
  if (!postcode) return NextResponse.json({ error: 'postcode required' }, { status: 400 })

  const result = await lookupProperty(postcode)
  return NextResponse.json(result)
}
