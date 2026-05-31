/**
 * Setu Account Aggregator Client
 *
 * Uses Setu's AA Bridge — handles all Sahamati/RBI compliance for you.
 * Sign up free at: https://bridge.setu.co/v2/signup
 * Docs: https://docs.setu.co/data/account-aggregator
 *
 * Sandbox base URL: https://fiu-sandbox.setu.co
 * Production base URL: https://fiu.setu.co
 */

// ── Config ────────────────────────────────────────────────────────────────────

const SETU_BASE_URL = process.env.SETU_BASE_URL ?? 'https://fiu-sandbox.setu.co'
const SETU_CLIENT_ID = process.env.SETU_CLIENT_ID ?? ''
const SETU_CLIENT_SECRET = process.env.SETU_CLIENT_SECRET ?? ''
const SETU_PRODUCT_INSTANCE_ID = process.env.SETU_PRODUCT_INSTANCE_ID ?? ''

// Legacy Finvu env var aliases (backwards compat)
const CLIENT_ID = SETU_CLIENT_ID || process.env.FINVU_CLIENT_ID || ''
const CLIENT_SECRET = SETU_CLIENT_SECRET || process.env.FINVU_CLIENT_SECRET || ''
const PRODUCT_INSTANCE_ID = SETU_PRODUCT_INSTANCE_ID || ''

export const AA_ENABLED = !!(CLIENT_ID && CLIENT_SECRET && PRODUCT_INSTANCE_ID)

// ── Types ─────────────────────────────────────────────────────────────────────

export type FIType =
  | 'DEPOSIT'
  | 'MUTUAL_FUNDS'
  | 'INSURANCE_POLICIES'
  | 'NPS'
  | 'EQUITIES'
  | 'ETF'
  | 'BONDS'
  | 'RECURRING_DEPOSIT'
  | 'TERM_DEPOSIT'
  | 'SIP'

export const FI_TYPE_LABELS: Record<FIType, string> = {
  DEPOSIT: 'Bank Accounts',
  MUTUAL_FUNDS: 'Mutual Funds',
  INSURANCE_POLICIES: 'Insurance Policies',
  NPS: 'NPS Pension',
  EQUITIES: 'Stocks & Demat',
  ETF: 'ETF Holdings',
  BONDS: 'Bonds',
  RECURRING_DEPOSIT: 'Recurring Deposits',
  TERM_DEPOSIT: 'Fixed Deposits',
  SIP: 'SIP / Mutual Funds',
}

export interface ConsentRequest {
  userHandle: string   // mobile@setu or aadhaar handle e.g. "9999999999@setu-sandbox"
  fiTypes: FIType[]
  dataRange: { from: string; to: string }
  consentDuration: { unit: 'DAY' | 'MONTH' | 'YEAR'; value: number }
  redirectUrl: string
}

export interface ConsentResponse {
  id: string
  redirectUrl: string   // Setu webview URL for user approval
  status: 'PENDING' | 'ACTIVE' | 'REJECTED' | 'REVOKED' | 'EXPIRED'
}

export interface DataSession {
  id: string
  status: 'PENDING' | 'PARTIAL' | 'COMPLETED' | 'EXPIRED' | 'FAILED'
}

export interface FIData {
  fipId: string
  fiType: FIType
  data: Record<string, unknown>[]
}

// ── Auth ──────────────────────────────────────────────────────────────────────

let cachedToken: string | null = null
let tokenExpiry = 0

async function getBearerToken(): Promise<string> {
  if (cachedToken && Date.now() < tokenExpiry) return cachedToken

  // Setu uses JWT token from their auth service
  const res = await fetch(`https://auth.setu.co/api/v1/auth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      clientID: CLIENT_ID,
      secret: CLIENT_SECRET,
    }),
  })

  if (!res.ok) {
    // Fall back to direct header auth (some Setu plans use this)
    return ''
  }

  const data = await res.json()
  cachedToken = data.access_token as string
  tokenExpiry = Date.now() + 50 * 60 * 1000  // 50 min
  return cachedToken
}

function buildHeaders(token: string) {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'x-product-instance-id': PRODUCT_INSTANCE_ID,
  }
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  } else {
    // Direct credential auth fallback
    headers['x-client-id'] = CLIENT_ID
    headers['x-client-secret'] = CLIENT_SECRET
  }
  return headers
}

async function setuPost<T>(path: string, body?: unknown): Promise<T> {
  const token = await getBearerToken().catch(() => '')
  const res = await fetch(`${SETU_BASE_URL}${path}`, {
    method: 'POST',
    headers: buildHeaders(token),
    body: body ? JSON.stringify(body) : undefined,
  })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Setu API ${res.status}: ${err}`)
  }
  return res.json() as Promise<T>
}

async function setuGet<T>(path: string): Promise<T> {
  const token = await getBearerToken().catch(() => '')
  const res = await fetch(`${SETU_BASE_URL}${path}`, {
    method: 'GET',
    headers: buildHeaders(token),
  })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Setu API ${res.status}: ${err}`)
  }
  return res.json() as Promise<T>
}

// ── Create consent ────────────────────────────────────────────────────────────

export async function createConsent(req: ConsentRequest): Promise<ConsentResponse> {
  const body = {
    consentDuration: req.consentDuration,
    vua: req.userHandle,           // Virtual User Address
    dataRange: {
      from: req.dataRange.from + 'T00:00:00Z',
      to: req.dataRange.to + 'T00:00:00Z',
    },
    context: [],
    additionalParams: {
      tags: [`tijori-${Date.now()}`],
      redirectUrl: req.redirectUrl,
    },
  }

  const resp = await setuPost<{
    id: string
    url: string
    status: string
  }>('/consents', body)

  return {
    id: resp.id,
    redirectUrl: resp.url,
    status: resp.status as ConsentResponse['status'],
  }
}

// ── Get consent status ────────────────────────────────────────────────────────

export async function getConsentStatus(consentId: string): Promise<ConsentResponse> {
  const resp = await setuGet<{
    id: string
    url: string
    status: string
  }>(`/consents/${consentId}`)

  return {
    id: resp.id,
    redirectUrl: resp.url ?? '',
    status: resp.status as ConsentResponse['status'],
  }
}

// ── Trigger data fetch ────────────────────────────────────────────────────────

export async function triggerDataFetch(consentId: string): Promise<DataSession> {
  const resp = await setuPost<{ id: string; status: string }>(
    `/consents/${consentId}/fetch`
  )
  return { id: resp.id, status: resp.status as DataSession['status'] }
}

// ── Get fetched data ──────────────────────────────────────────────────────────

export async function getFetchedData(consentId: string): Promise<FIData[]> {
  const sessions = await setuGet<{ sessions: Array<{ id: string; status: string }> }>(
    `/v2/consents/${consentId}/data-sessions`
  )

  const results: FIData[] = []
  for (const session of (sessions.sessions ?? [])) {
    if (session.status === 'COMPLETED') {
      try {
        const data = await setuGet<{ data: FIData[] }>(`/data-sessions/${session.id}`)
        results.push(...(data.data ?? []))
      } catch {
        // Session data may not be available — skip
      }
    }
  }
  return results
}

// ── Map Setu data to Vaultly assets ──────────────────────────────────────────

export interface MappedAsset {
  name: string
  category: string
  value: number
  currency: string
  institution: string
  notes: string
}

export function mapAccountToAsset(account: Record<string, unknown>, fiType: FIType): MappedAsset | null {
  switch (fiType) {
    case 'DEPOSIT': {
      const balance = Number(account.currentBalance ?? account.balance ?? 0)
      if (!balance) return null
      return {
        name: String(account.bankName ?? account.institution ?? account.maskedAccountNumber ?? 'Bank Account'),
        category: account.accountType === 'TERM_DEPOSIT' ? 'fd' : 'bank_account',
        value: balance,
        currency: String(account.currency ?? 'INR'),
        institution: String(account.bankName ?? account.fipName ?? ''),
        notes: `Acc: ${account.maskedAccountNumber ?? 'N/A'} · via Setu AA`,
      }
    }
    case 'MUTUAL_FUNDS':
    case 'SIP': {
      const value = Number(account.currentValue ?? account.portfolioValue ?? 0)
      if (!value) return null
      return {
        name: String(account.schemeName ?? account.fundName ?? account.folioNo ?? 'Mutual Fund'),
        category: String(account.schemeCategory ?? '').toLowerCase().includes('elss') ? 'elss' : 'sip',
        value,
        currency: 'INR',
        institution: String(account.amc ?? account.fundHouse ?? ''),
        notes: `Folio: ${account.folioNo ?? 'N/A'} · via Setu AA`,
      }
    }
    case 'EQUITIES': {
      const value = Number(account.portfolioValue ?? account.currentValue ?? 0)
      if (!value) return null
      return {
        name: String(account.dpName ?? account.institution ?? 'Demat Portfolio'),
        category: 'investment',
        value,
        currency: 'INR',
        institution: String(account.dpName ?? account.broker ?? ''),
        notes: `via Setu AA`,
      }
    }
    case 'NPS': {
      const value = Number(account.totalValue ?? account.netAssetValue ?? 0)
      if (!value) return null
      return {
        name: `NPS - ${account.pran ?? 'Account'}`,
        category: 'nps',
        value,
        currency: 'INR',
        institution: String(account.npsBank ?? account.fundManager ?? 'PFRDA'),
        notes: `PRAN: ${account.pran ?? 'N/A'} · via Setu AA`,
      }
    }
    default:
      return null
  }
}
