import { NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import { auth } from '@/lib/auth'
import { buildAuthUrl, signState } from '@/lib/truelayer'

/**
 * GET /api/connections/auth
 *
 * Generate a TrueLayer OAuth authorisation URL for the current user.
 * The state parameter is HMAC-signed to prevent CSRF attacks.
 *
 * Returns: { url: string }
 */
export async function GET() {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const state = signState({
    userId: session.user.id,
    householdId: session.user.householdId,
    nonce: randomUUID(),
  })

  const url = buildAuthUrl(state)

  return NextResponse.json({ url })
}
