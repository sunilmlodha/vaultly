/**
 * Finvu Account Aggregator Client
 *
 * Implements the ReBIT AA 2.0 specification as used by Finvu.
 * Sandbox docs: https://docs.finvu.in
 * Sandbox AA: SIMULATOR@finvu
 * Sandbox webview: https://webvwdev.finvu.in
 * Prod webview: https://webvw.finvu.in
 */

import { randomUUID } from 'crypto'

// ── Config ────────────────────────────────────────────────────────────────────

const FINVU_BASE_URL = process.env.FINVU_BASE_URL ?? 'https://webvwdev.finvu.in'
const FINVU_CLIENT_ID = process.env.FINVU_CLIENT_ID ?? ''
const FINVU_CLIENT_SECRET = process.env.FINVU_CLIENT_SECRET ?? ''
const AA_HANDLE = process.env.FINVU_AA_HANDLE ?? 'SIMULATOR@finvu'
// FIU (Financial Information User) — registered entity ID
const FIU_ENTITY_ID = process.env.FINVU_FIU_ID ?? 'tijori-fiu-sandbox'

// ── Types ─────────────────────────────────────────────────────────────────────

export type FIType =
  | 'DEPOSIT'        // Savings, current, FD accounts
  | 'MUTUAL_FUNDS'   // MF folios
  | 'INSURANCE'      // Life + general policies
  | 'NPS'            // National Pension System
  | 'EQUITIES'       // Demat / stock holdings
  | 'ETF'            // Exchange traded funds
  | 'BONDS'          // Government + corporate bonds
  | 'RECURRING_DEPOSIT'
  | 'TERM_DEPOSIT'

export const FI_TYPE_LABELS: Record<FIType, string> = {
  DEPOSIT: 'Bank Accounts & FDs',
  MUTUAL_FUNDS: 'Mutual Funds',
  INSURANCE: 'Insurance Policies',
  NPS: 'National Pension System',
  EQUITIES: 'Stocks & Shares',
  ETF: 'ETF Holdings',
  BONDS: 'Bonds',
  RECURRING_DEPOSIT: 'Recurring Deposits',
  TERM_DEPOSIT: 'Fixed Deposits',
}

export type ConsentPurpose =
  | 'WEALTH_MANAGEMENT'
  | 'FINANCIAL_PLANNING'
  | 'ACCOUNT_AGGREGATION'

export interface ConsentRequest {
  userId: string
  fiTypes: FIType[]
  purpose: ConsentPurpose
  dataRange: {         // how many months of history
    from: string       // ISO date
    to: string         // ISO date
  }
  consentDuration: number // days consent is valid
  dataFetchFrequency: 'ONETIME' | 'PERIODIC'
  redirectUrl: string  // where to return after consent
}

export interface ConsentResponse {
  consentHandle: string
  redirectUrl: string  // Finvu webview URL for user to approve
}

export interface DataSessionResponse {
  sessionId: string
  fiTypes: FIType[]
}

export interface FIAccount {
  fipId: string
  fipName: string
  fiType: FIType
  accType: string
  accRefNumber: string
  maskedAccNumber: string
  linkedLastUpdatedOn: string
}

export interface FIData {
  fipId: string
  fiType: FIType
  data: Record<string, unknown>[]  // decrypted and mapped data
}

// ── Auth ──────────────────────────────────────────────────────────────────────

let authToken: string | null = null
let tokenExpiry: number = 0

async function getToken(): Promise<string> {
  if (authToken && Date.now() < tokenExpiry) return authToken

  const res = await fetch(`${FINVU_BASE_URL}/FinvuClient/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      clientId: FINVU_CLIENT_ID,
      clientSecret: FINVU_CLIENT_SECRET,
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Finvu auth failed: ${err}`)
  }

  const data = await res.json()
  authToken = data.token as string
  tokenExpiry = Date.now() + 55 * 60 * 1000 // 55 min (tokens typically last 60)
  return authToken
}

async function finvuPost<T>(path: string, body: unknown): Promise<T> {
  const token = await getToken()
  const res = await fetch(`${FINVU_BASE_URL}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Finvu API error ${res.status}: ${err}`)
  }
  return res.json() as Promise<T>
}

// ── Consent creation ──────────────────────────────────────────────────────────

export async function createConsent(req: ConsentRequest): Promise<ConsentResponse> {
  const txnId = randomUUID()
  const now = new Date()
  const expiry = new Date(now.getTime() + req.consentDuration * 24 * 60 * 60 * 1000)

  const payload = {
    ver: '2.0.0',
    timestamp: now.toISOString(),
    txnid: txnId,
    ConsentDetail: {
      consentStart: now.toISOString(),
      consentExpiry: expiry.toISOString(),
      consentMode: 'VIEW',
      fetchType: req.dataFetchFrequency,
      consentTypes: ['TRANSACTIONS', 'SUMMARY', 'PROFILE'],
      fiTypes: req.fiTypes,
      Customer: {
        id: `${req.userId}@${AA_HANDLE.split('@')[1]}`,
      },
      FIDataRange: {
        from: req.dataRange.from,
        to: req.dataRange.to,
      },
      DataConsumer: {
        id: FIU_ENTITY_ID,
      },
      DataLife: {
        unit: 'MONTH',
        value: 3,
      },
      Frequency: {
        unit: 'MONTH',
        value: 1,
      },
      Purpose: {
        code: '101',
        refUri: 'https://api.rebit.org.in/aa/purpose/101.xml',
        text: 'Wealth management service',
        Category: {
          type: 'string',
        },
      },
    },
  }

  const response = await finvuPost<{ ConsentHandle: string }>('/FinvuClient/consent/initiate', payload)

  // Build redirect URL to Finvu webview
  const webviewUrl = new URL(`${FINVU_BASE_URL}/FinvuClient/consent/handle`)
  webviewUrl.searchParams.set('consentHandle', response.ConsentHandle)
  webviewUrl.searchParams.set('redirect_uri', req.redirectUrl)

  return {
    consentHandle: response.ConsentHandle,
    redirectUrl: webviewUrl.toString(),
  }
}

// ── Fetch consent status after user approves ──────────────────────────────────

export async function getConsentStatus(consentHandle: string): Promise<{
  status: 'PENDING' | 'READY' | 'REJECTED' | 'REVOKED' | 'EXPIRED'
  consentId?: string
}> {
  const result = await finvuPost<{ status: string; consentId?: string }>(
    '/FinvuClient/consent/status',
    { consentHandle }
  )
  return {
    status: result.status as 'PENDING' | 'READY' | 'REJECTED' | 'REVOKED' | 'EXPIRED',
    consentId: result.consentId,
  }
}

// ── Create data session (after consent approved) ──────────────────────────────

export async function createDataSession(
  consentId: string,
  fiTypes: FIType[],
  dataRange: { from: string; to: string }
): Promise<DataSessionResponse> {
  const txnId = randomUUID()

  const result = await finvuPost<{ sessionId: string }>(
    '/FinvuClient/fi/request',
    {
      ver: '2.0.0',
      timestamp: new Date().toISOString(),
      txnid: txnId,
      FIDataRange: dataRange,
      Consent: { id: consentId },
    }
  )

  return { sessionId: result.sessionId, fiTypes }
}

// ── Fetch financial data ──────────────────────────────────────────────────────

export async function fetchFIData(sessionId: string): Promise<FIData[]> {
  const result = await finvuPost<{ FI: Array<{ fipID: string; data: { encryptedFI: string[] } }> }>(
    '/FinvuClient/fi/fetch',
    { sessionId }
  )

  // In production, data is JWE-encrypted. Decrypt with FIU private key.
  // For sandbox, data may be returned as plain JSON.
  // This is a simplified mapping — production requires JWE decryption.
  return (result.FI ?? []).map(fip => ({
    fipId: fip.fipID,
    fiType: 'DEPOSIT' as FIType,   // determined from actual decrypted data
    data: (fip.data?.encryptedFI ?? []).map(s => ({ raw: s })),
  }))
}

// ── Map AA data to Vaultly asset format ───────────────────────────────────────

export interface MappedAsset {
  name: string
  category: string
  value: number
  currency: string
  institution: string
  notes: string
  source: 'aa'
}

export function mapDepositToAsset(account: Record<string, unknown>): MappedAsset {
  return {
    name: `${account.bankName ?? account.maskedAccountNumber ?? 'Bank Account'}`,
    category: account.accountType === 'FIXED_DEPOSIT' ? 'fd' : 'bank_account',
    value: Number(account.currentBalance ?? 0),
    currency: 'INR',
    institution: String(account.bankName ?? ''),
    notes: `Linked via Account Aggregator · ${account.maskedAccountNumber ?? ''}`,
    source: 'aa',
  }
}

export function mapMutualFundToAsset(fund: Record<string, unknown>): MappedAsset {
  return {
    name: String(fund.schemeName ?? fund.folioNo ?? 'Mutual Fund'),
    category: String(fund.schemeCategory ?? '').includes('ELSS') ? 'elss' : 'sip',
    value: Number(fund.currentValue ?? 0),
    currency: 'INR',
    institution: String(fund.amc ?? ''),
    notes: `Folio: ${fund.folioNo ?? 'N/A'} · Linked via Account Aggregator`,
    source: 'aa',
  }
}
