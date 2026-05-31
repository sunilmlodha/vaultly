/**
 * POST /api/india/aa/consent
 * Creates a Setu AA consent request.
 * Returns webview URL to redirect user for bank approval.
 *
 * Sign up at bridge.setu.co/v2/signup to get credentials.
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { randomUUID } from 'crypto'
import { AA_ENABLED, createConsent, type FIType } from '@/lib/india/aa/client'

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const userId = session.user.id
  const body = await req.json().catch(() => ({}))
  const fiTypes: FIType[] = body.fiTypes ?? ['DEPOSIT', 'MUTUAL_FUNDS']
  const userMobile: string = body.userMobile ?? ''

  const baseUrl = process.env.NEXTAUTH_URL ?? 'https://tijori-xi.vercel.app'

  // No credentials — show setup guide
  if (!AA_ENABLED) {
    return NextResponse.json({
      sandbox: true,
      message: 'Setu credentials not configured.',
      setup: {
        step1: 'Sign up free at https://bridge.setu.co/v2/signup',
        step2: 'Create an FIU product in The Bridge dashboard',
        step3: 'Copy your credentials and add to Vercel Tijori env vars:',
        envVars: [
          'SETU_CLIENT_ID=your_x_client_id',
          'SETU_CLIENT_SECRET=your_x_client_secret',
          'SETU_PRODUCT_INSTANCE_ID=your_product_instance_id',
          'SETU_BASE_URL=https://fiu-sandbox.setu.co',
        ],
        step4: 'Redeploy Tijori — live AA connections immediately',
        docsUrl: 'https://docs.setu.co/data/account-aggregator/quickstart',
      },
    })
  }

  // Need mobile number for VUA (Virtual User Address)
  if (!userMobile) {
    return NextResponse.json({ error: 'userMobile required for AA consent' }, { status: 400 })
  }

  try {
    const now = new Date()
    const from = new Date(now)
    from.setFullYear(from.getFullYear() - 2)

    // VUA format: mobile@setu-sandbox (sandbox) or mobile@onemoney (prod)
    const aaSuffix = (process.env.SETU_BASE_URL ?? '').includes('sandbox') ? 'setu-sandbox' : 'onemoney'
    const userHandle = `${userMobile}@${aaSuffix}`

    const consent = await createConsent({
      userHandle,
      fiTypes,
      dataRange: {
        from: from.toISOString().split('T')[0],
        to: now.toISOString().split('T')[0],
      },
      consentDuration: { unit: 'MONTH', value: 6 },
      redirectUrl: `${baseUrl}/api/india/aa/callback`,
    })

    // Store consent in DB
    await db.execute({
      sql: `INSERT OR REPLACE INTO aa_consents
              (id, user_id, consent_handle, fi_types, status, created_at)
            VALUES (?, ?, ?, ?, 'PENDING', datetime('now'))`,
      args: [randomUUID(), userId, consent.id, JSON.stringify(fiTypes)],
    }).catch(() => {})

    return NextResponse.json({
      consentId: consent.id,
      redirectUrl: consent.redirectUrl,
    })
  } catch (err) {
    console.error('[AA consent]', err)
    return NextResponse.json(
      { error: `Failed to create consent: ${err instanceof Error ? err.message : err}` },
      { status: 500 }
    )
  }
}
