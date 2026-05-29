/**
 * TrueLayer Open Banking integration library for Vaultly.
 *
 * Covers:
 *  - OAuth URL construction + HMAC-SHA256 signed state
 *  - Token exchange & refresh
 *  - Account / balance / transaction data fetching
 *  - Account-type → Vaultly side/category mapping
 *  - AES-256-GCM token encryption for round-trip through the client
 *  - Recurring payment detection (monthly subscriptions)
 */

import { createHmac, createCipheriv, createDecipheriv, randomBytes } from 'crypto'
import { differenceInDays, addDays } from 'date-fns'
import type { TLAccount, DetectedRecurring, AssetCategory, LiabilityCategory } from '@/lib/types'

// ─── Environment helpers ──────────────────────────────────────────────────────

const SANDBOX = process.env.TRUELAYER_SANDBOX === 'true'

const AUTH_BASE = SANDBOX
  ? 'https://auth.truelayer-sandbox.com'
  : 'https://auth.truelayer.com'

const API_BASE = SANDBOX
  ? 'https://api.truelayer-sandbox.com'
  : 'https://api.truelayer.com'

const PROVIDERS = SANDBOX ? 'mock' : 'uk-ob-all uk-oauth-all'

function getClientId(): string {
  const v = process.env.TRUELAYER_CLIENT_ID
  if (!v) throw new Error('TRUELAYER_CLIENT_ID is not set')
  return v
}

function getClientSecret(): string {
  const v = process.env.TRUELAYER_CLIENT_SECRET
  if (!v) throw new Error('TRUELAYER_CLIENT_SECRET is not set')
  return v
}

function getRedirectUri(): string {
  const v = process.env.TRUELAYER_REDIRECT_URI
  if (!v) throw new Error('TRUELAYER_REDIRECT_URI is not set')
  return v
}

function getNextAuthSecret(): string {
  const v = process.env.NEXTAUTH_SECRET
  if (!v) throw new Error('NEXTAUTH_SECRET is not set')
  return v
}

// ─── OAuth ────────────────────────────────────────────────────────────────────

/**
 * Build the TrueLayer authorisation URL that the user should be redirected to.
 * The `state` parameter must be a signed value produced by `signState`.
 */
export function buildAuthUrl(state: string): string {
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: getClientId(),
    redirect_uri: getRedirectUri(),
    scope: 'info accounts balance transactions cards offline_access',
    providers: PROVIDERS,
    state,
  })
  return `${AUTH_BASE}/?${params.toString()}`
}

// ─── State signing ────────────────────────────────────────────────────────────

interface StatePayload {
  userId: string
  householdId: string
  nonce: string
}

interface SignedStateEnvelope {
  data: string   // JSON-serialised StatePayload + iat
  sig: string    // HMAC-SHA256 hex of `data`
}

/**
 * HMAC-SHA256 sign a state payload so it cannot be forged.
 * Returns a base64url-encoded JSON envelope.
 */
export function signState(payload: StatePayload): string {
  const iat = Date.now()
  const data = JSON.stringify({ ...payload, iat })
  const sig = createHmac('sha256', getNextAuthSecret()).update(data).digest('hex')
  const envelope: SignedStateEnvelope = { data, sig }
  return Buffer.from(JSON.stringify(envelope)).toString('base64url')
}

/**
 * Verify a signed state string.
 * Throws if the signature is invalid or the token is older than 10 minutes.
 */
export function verifyState(state: string): StatePayload {
  let envelope: SignedStateEnvelope
  try {
    envelope = JSON.parse(Buffer.from(state, 'base64url').toString('utf8')) as SignedStateEnvelope
  } catch {
    throw new Error('Invalid state: failed to decode envelope')
  }

  const expectedSig = createHmac('sha256', getNextAuthSecret())
    .update(envelope.data)
    .digest('hex')

  if (expectedSig !== envelope.sig) {
    throw new Error('Invalid state: signature mismatch')
  }

  let parsed: StatePayload & { iat: number }
  try {
    parsed = JSON.parse(envelope.data) as StatePayload & { iat: number }
  } catch {
    throw new Error('Invalid state: failed to parse data')
  }

  const ageMs = Date.now() - parsed.iat
  if (ageMs < 0 || ageMs > 10 * 60 * 1000) {
    throw new Error('Invalid state: token expired or issued in the future')
  }

  return { userId: parsed.userId, householdId: parsed.householdId, nonce: parsed.nonce }
}

// ─── Token exchange & refresh ─────────────────────────────────────────────────

export interface TLTokens {
  access_token: string
  refresh_token: string
  expires_in: number
  consent_expires_at: string
}

/**
 * Exchange an authorisation code for access + refresh tokens.
 */
export async function exchangeCode(code: string): Promise<TLTokens> {
  const res = await fetch(`${AUTH_BASE}/connect/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: getClientId(),
      client_secret: getClientSecret(),
      redirect_uri: getRedirectUri(),
      code,
    }),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`TrueLayer token exchange failed (${res.status}): ${text}`)
  }

  const json = await res.json() as {
    access_token: string
    refresh_token: string
    expires_in: number
    consent_expires_at?: string
    token_type: string
  }

  // TrueLayer returns `consent_expires_at` as an ISO-8601 string. If it's
  // absent (sandbox may omit it), default to 90 days from now.
  const consentExpiresAt =
    json.consent_expires_at ??
    new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString()

  return {
    access_token: json.access_token,
    refresh_token: json.refresh_token,
    expires_in: json.expires_in,
    consent_expires_at: consentExpiresAt,
  }
}

export interface TLRefreshedTokens {
  access_token: string
  refresh_token: string
  expires_in: number
}

/**
 * Use a refresh token to obtain a new access token.
 */
export async function refreshTokens(refreshToken: string): Promise<TLRefreshedTokens> {
  const res = await fetch(`${AUTH_BASE}/connect/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: getClientId(),
      client_secret: getClientSecret(),
      refresh_token: refreshToken,
    }),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`TrueLayer token refresh failed (${res.status}): ${text}`)
  }

  const json = await res.json() as {
    access_token: string
    refresh_token: string
    expires_in: number
  }

  return {
    access_token: json.access_token,
    refresh_token: json.refresh_token,
    expires_in: json.expires_in,
  }
}

// ─── Data fetching ────────────────────────────────────────────────────────────

interface TLAccountRaw {
  account_id: string
  account_type: string
  display_name: string
  currency: string
  provider: {
    display_name: string
    logo_uri?: string
    provider_id: string
  }
}

interface TLBalanceRaw {
  available: number
  current: number
  currency: string
}

interface TLTransactionRaw {
  transaction_id: string
  timestamp: string   // ISO-8601 date-time
  description: string
  merchant_name?: string
  amount: number
  currency: string
  transaction_type: string  // DEBIT | CREDIT
}

/**
 * Fetch all accounts for the authenticated user, enriching each with its
 * current balance.
 */
export async function fetchAccounts(accessToken: string): Promise<TLAccount[]> {
  const res = await fetch(`${API_BASE}/data/v1/accounts`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`TrueLayer fetchAccounts failed (${res.status}): ${text}`)
  }

  const json = await res.json() as { results: TLAccountRaw[] }
  const accounts = json.results ?? []

  // Enrich each account with its balance (parallel requests)
  const enriched = await Promise.all(
    accounts.map(async (acct): Promise<TLAccount> => {
      let balance: number | undefined
      try {
        balance = await fetchBalance(accessToken, acct.account_id)
      } catch {
        // Non-fatal: balance fetch may fail for unsupported account types
        balance = undefined
      }

      const { side, category } = mapAccountType(acct.account_type)

      return {
        account_id: acct.account_id,
        account_type: acct.account_type,
        display_name: acct.display_name,
        currency: acct.currency,
        provider: acct.provider,
        balance,
        side,
        category,
      }
    })
  )

  return enriched
}

/**
 * Fetch the balance for a single account.
 *
 * - TRANSACTION / SAVINGS accounts: returns `available` balance
 * - CREDIT_CARD accounts: returns `current` as a positive number (amount owed)
 * - Other types: returns `current`
 */
export async function fetchBalance(accessToken: string, accountId: string): Promise<number> {
  // TrueLayer exposes balances under /accounts/:id/balance and
  // /cards/:id/balance for credit cards. Try accounts first, fall back to cards.
  const tryPaths = [
    `${API_BASE}/data/v1/accounts/${accountId}/balance`,
    `${API_BASE}/data/v1/cards/${accountId}/balance`,
  ]

  let lastError: Error | null = null
  for (const url of tryPaths) {
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    if (!res.ok) {
      lastError = new Error(`TrueLayer fetchBalance failed (${res.status}) for ${url}`)
      continue
    }

    const json = await res.json() as { results: TLBalanceRaw[] }
    const b = json.results?.[0]
    if (!b) {
      lastError = new Error(`TrueLayer fetchBalance: empty results for ${accountId}`)
      continue
    }

    // Credit card: current is the amount owed (can be negative in TrueLayer
    // convention where negative = you owe money). Return as positive.
    if (url.includes('/cards/')) {
      return Math.abs(b.current)
    }

    return b.available ?? b.current
  }

  throw lastError ?? new Error(`fetchBalance: no valid response for ${accountId}`)
}

export interface TLTransaction {
  id: string
  date: string           // YYYY-MM-DD
  description: string
  merchant_name?: string
  amount: number         // negative = debit, positive = credit
  currency: string
  transaction_type: string
}

/**
 * Fetch up to 3 months of transactions for a given account.
 */
export async function fetchTransactions(
  accessToken: string,
  accountId: string
): Promise<TLTransaction[]> {
  const from = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  const to = new Date().toISOString().split('T')[0]

  // Try the accounts endpoint first; fall back to cards
  const tryPaths = [
    `${API_BASE}/data/v1/accounts/${accountId}/transactions?from=${from}&to=${to}`,
    `${API_BASE}/data/v1/cards/${accountId}/transactions?from=${from}&to=${to}`,
  ]

  let lastError: Error | null = null
  for (const url of tryPaths) {
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    if (!res.ok) {
      lastError = new Error(`TrueLayer fetchTransactions failed (${res.status}) for ${url}`)
      continue
    }

    const json = await res.json() as { results: TLTransactionRaw[] }
    const results = json.results ?? []

    return results.map((t): TLTransaction => ({
      id: t.transaction_id,
      // TrueLayer timestamp is ISO-8601; extract date portion
      date: t.timestamp.split('T')[0],
      description: t.description,
      merchant_name: t.merchant_name,
      amount: t.amount,
      currency: t.currency,
      transaction_type: t.transaction_type,
    }))
  }

  throw lastError ?? new Error(`fetchTransactions: no valid response for ${accountId}`)
}

// ─── Account type mapping ─────────────────────────────────────────────────────

/**
 * Map a TrueLayer account type string to a Vaultly side + category.
 */
export function mapAccountType(
  tlType: string
): { side: 'asset' | 'liability'; category: AssetCategory | LiabilityCategory } {
  const t = tlType?.toUpperCase()
  switch (t) {
    case 'TRANSACTION':
    case 'SAVINGS':
      return { side: 'asset', category: 'bank_account' }
    case 'CREDIT_CARD':
      return { side: 'liability', category: 'credit_card' }
    case 'LOAN':
      return { side: 'liability', category: 'loan' }
    case 'MORTGAGE':
      return { side: 'liability', category: 'mortgage' }
    case 'PENSION':
      return { side: 'asset', category: 'pension' }
    case 'INVESTMENT':
      return { side: 'asset', category: 'investment' }
    default:
      return { side: 'asset', category: 'other' }
  }
}

// ─── Token encryption ─────────────────────────────────────────────────────────

/**
 * Derive a 32-byte AES key from NEXTAUTH_SECRET + userId via HMAC-SHA256.
 */
function deriveKey(userId: string): Buffer {
  return createHmac('sha256', getNextAuthSecret())
    .update(userId)
    .digest()
}

/**
 * Encrypt a JSON-serialisable object with AES-256-GCM.
 *
 * Output layout (base64url encoded):
 *   [IV (12 bytes)] [authTag (16 bytes)] [ciphertext (variable)]
 */
export function encryptForSession(data: object, userId: string): string {
  const key = deriveKey(userId)
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', key, iv)

  const plaintext = JSON.stringify(data)
  const ciphertext = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final(),
  ])
  const authTag = cipher.getAuthTag()

  // Concatenate IV + authTag + ciphertext
  const combined = Buffer.concat([iv, authTag, ciphertext])
  return combined.toString('base64url')
}

/**
 * Decrypt a value produced by `encryptForSession`.
 */
export function decryptForSession(encrypted: string, userId: string): object {
  const key = deriveKey(userId)
  const combined = Buffer.from(encrypted, 'base64url')

  if (combined.length < 12 + 16) {
    throw new Error('decryptForSession: ciphertext too short')
  }

  const iv = combined.subarray(0, 12)
  const authTag = combined.subarray(12, 28)
  const ciphertext = combined.subarray(28)

  const decipher = createDecipheriv('aes-256-gcm', key, iv)
  decipher.setAuthTag(authTag)

  const plaintext = Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ]).toString('utf8')

  return JSON.parse(plaintext) as object
}

// ─── Recurring payment detection ─────────────────────────────────────────────

interface RawTransaction {
  merchant_name?: string
  description: string
  amount: number
  currency: string
  date: string  // YYYY-MM-DD
}

/**
 * Normalise a merchant name / description into a stable grouping key.
 * Lowercases, strips punctuation, takes first 4 words.
 */
function normaliseMerchantKey(tx: RawTransaction): string {
  const raw = tx.merchant_name ?? tx.description
  return raw
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .trim()
    .split(/\s+/)
    .slice(0, 4)
    .join(' ')
}

/**
 * Check whether an array of amounts is within ±5 % of each other.
 */
function amountsWithinTolerance(amounts: number[], tolerance = 0.05): boolean {
  if (amounts.length < 2) return true
  const ref = Math.abs(amounts[0])
  return amounts.every((a) => {
    const diff = Math.abs(Math.abs(a) - ref)
    return diff / ref <= tolerance
  })
}

/**
 * Detect recurring monthly debit payments from a list of transactions.
 *
 * Criteria:
 *  - Must be a debit (amount < 0)
 *  - ≥ 2 transactions with the same normalised merchant key
 *  - Amounts within 5 % tolerance of each other
 *  - Date gaps between consecutive transactions are 25–40 days (monthly cadence)
 */
export function detectRecurringPayments(transactions: RawTransaction[]): DetectedRecurring[] {
  // 1. Filter debits only
  const debits = transactions.filter((t) => t.amount < 0)

  // 2. Group by normalised merchant key
  const groups = new Map<string, RawTransaction[]>()
  for (const tx of debits) {
    const key = normaliseMerchantKey(tx)
    if (!key) continue
    const existing = groups.get(key)
    if (existing) {
      existing.push(tx)
    } else {
      groups.set(key, [tx])
    }
  }

  const results: DetectedRecurring[] = []

  for (const [key, txs] of groups) {
    // Need at least 2 transactions
    if (txs.length < 2) continue

    // Sort by date ascending
    const sorted = [...txs].sort((a, b) => a.date.localeCompare(b.date))

    // Check amount tolerance
    const amounts = sorted.map((t) => t.amount)
    if (!amountsWithinTolerance(amounts)) continue

    // Check that consecutive gaps are 25–40 days (monthly)
    const gaps: number[] = []
    let allMonthly = true
    for (let i = 1; i < sorted.length; i++) {
      const gap = differenceInDays(
        new Date(sorted[i].date),
        new Date(sorted[i - 1].date)
      )
      if (gap < 25 || gap > 40) {
        allMonthly = false
        break
      }
      gaps.push(gap)
    }
    if (!allMonthly || gaps.length === 0) continue

    // Compute predicted next date: last date + average gap
    const avgGap = Math.round(gaps.reduce((s, g) => s + g, 0) / gaps.length)
    const lastDate = new Date(sorted[sorted.length - 1].date)
    const nextDate = addDays(lastDate, avgGap)

    // Representative amount (average of absolute values)
    const avgAmount =
      sorted.reduce((s, t) => s + Math.abs(t.amount), 0) / sorted.length

    // Use the most descriptive available name
    const representativeName =
      sorted[sorted.length - 1].merchant_name ??
      sorted[sorted.length - 1].description

    results.push({
      merchant_key: key,
      name: representativeName,
      amount: Math.round(avgAmount * 100) / 100,
      currency: sorted[0].currency,
      frequency: 'monthly',
      next_renewal_date: nextDate.toISOString().split('T')[0],
      transaction_count: sorted.length,
    })
  }

  return results
}
