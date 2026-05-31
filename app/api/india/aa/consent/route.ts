/**
 * POST /api/india/aa/consent
 * Initiates an Account Aggregator consent request via Finvu.
 * Returns a redirect URL to the Finvu webview for user approval.
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { randomUUID } from 'crypto'
import {
  createConsent,
  type FIType,
  type ConsentPurpose,
} from '@/lib/india/aa/client'

const FINVU_ENABLED = !!(process.env.FINVU_CLIENT_ID && process.env.FINVU_CLIENT_SECRET)

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const userId = session.user.id
  const body = await req.json().catch(() => ({}))

  const fiTypes: FIType[] = body.fiTypes ?? ['DEPOSIT', 'MUTUAL_FUNDS']
  const consentDuration: number = body.consentDuration ?? 180
  const purpose: ConsentPurpose = body.purpose ?? 'WEALTH_MANAGEMENT'

  const baseUrl = process.env.NEXTAUTH_URL ?? 'https://tijori-xi.vercel.app'
  const redirectUrl = `${baseUrl}/api/india/aa/callback`

  const now = new Date()
  const fromDate = new Date(now)
  fromDate.setFullYear(fromDate.getFullYear() - 2)  // 2 years of history

  // Store pending consent in DB
  const consentRow = randomUUID()

  if (!FINVU_ENABLED) {
    // Sandbox mode — return mock redirect for UI testing
    return NextResponse.json({
      sandbox: true,
      consentHandle: `sandbox-${consentRow.slice(0, 8)}`,
      redirectUrl: `${baseUrl}/connections/aa?demo=success&fiTypes=${fiTypes.join(',')}`,
      message: 'Finvu credentials not configured — showing demo flow.',
    })
  }

  try {
    const consent = await createConsent({
      userId,
      fiTypes,
      purpose,
      dataRange: {
        from: fromDate.toISOString().split('T')[0],
        to: now.toISOString().split('T')[0],
      },
      consentDuration,
      dataFetchFrequency: 'ONETIME',
      redirectUrl,
    })

    // Persist consent handle for callback lookup
    await db.execute({
      sql: `INSERT OR REPLACE INTO aa_consents
              (id, user_id, consent_handle, fi_types, status, created_at)
            VALUES (?, ?, ?, ?, 'PENDING', datetime('now'))`,
      args: [consentRow, userId, consent.consentHandle, JSON.stringify(fiTypes)],
    }).catch(() => {
      // aa_consents table may not exist yet in DB — non-critical
    })

    return NextResponse.json({
      consentHandle: consent.consentHandle,
      redirectUrl: consent.redirectUrl,
    })
  } catch (err) {
    console.error('[AA consent]', err)
    return NextResponse.json(
      { error: 'Failed to create consent. Check Finvu credentials.' },
      { status: 500 }
    )
  }
}
