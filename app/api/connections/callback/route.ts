import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import {
  verifyState,
  exchangeCode,
  fetchAccounts,
  mapAccountType,
  encryptForSession,
} from '@/lib/truelayer'

interface CallbackBody {
  code: string
  state: string
}

/**
 * POST /api/connections/callback
 *
 * Exchange a TrueLayer authorisation code for tokens, fetch all accounts
 * (already enriched with balances), and return the data needed for the user
 * to review and map accounts before finalising the connection.
 *
 * Body: { code: string, state: string }
 *
 * Returns:
 * {
 *   accounts: TLAccount[],    // includes balance, side, category
 *   bank_name: string,
 *   bank_logo_url: string | undefined,
 *   bank_id: string,
 *   encrypted_tokens: string, // AES-256-GCM, safe to store client-side temporarily
 *   consent_expires_at: string,
 *   token_expires_at: string,
 * }
 */
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: CallbackBody
  try {
    body = (await req.json()) as CallbackBody
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { code, state } = body
  if (!code || !state) {
    return NextResponse.json({ error: 'Missing code or state' }, { status: 400 })
  }

  // 1. Verify the signed state and ensure it belongs to the current user
  let statePayload: { userId: string; householdId: string; nonce: string }
  try {
    statePayload = verifyState(state)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'State verification failed'
    return NextResponse.json({ error: message }, { status: 400 })
  }

  if (statePayload.userId !== session.user.id) {
    return NextResponse.json({ error: 'State user mismatch' }, { status: 403 })
  }

  // 2. Exchange the authorisation code for tokens
  let tokens: Awaited<ReturnType<typeof exchangeCode>>
  try {
    tokens = await exchangeCode(code)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Token exchange failed'
    return NextResponse.json({ error: message }, { status: 502 })
  }

  // 3. Fetch accounts (already includes balances via fetchAccounts in lib)
  let accounts: Awaited<ReturnType<typeof fetchAccounts>>
  try {
    accounts = await fetchAccounts(tokens.access_token)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to fetch accounts'
    return NextResponse.json({ error: message }, { status: 502 })
  }

  // 4. Ensure side/category are set on each account (fetchAccounts already
  //    calls mapAccountType internally, but we do a defensive pass here)
  const enrichedAccounts = accounts.map((acct) => {
    if (!acct.side || !acct.category) {
      const mapped = mapAccountType(acct.account_type)
      return { ...acct, ...mapped }
    }
    return acct
  })

  // 5. Extract provider metadata from the first account (all accounts in a
  //    single OAuth flow belong to the same provider)
  const provider = enrichedAccounts[0]?.provider
  const bank_name = provider?.display_name ?? 'Unknown Bank'
  const bank_logo_url = provider?.logo_uri
  const bank_id = provider?.provider_id ?? 'unknown'

  // 6. Encrypt tokens for temporary client-side storage
  const encrypted_tokens = encryptForSession(tokens, session.user.id)

  // 7. Compute token expiry timestamp
  const token_expires_at = new Date(
    Date.now() + tokens.expires_in * 1000
  ).toISOString()

  return NextResponse.json({
    accounts: enrichedAccounts,
    bank_name,
    bank_logo_url,
    bank_id,
    encrypted_tokens,
    consent_expires_at: tokens.consent_expires_at,
    token_expires_at,
  })
}
