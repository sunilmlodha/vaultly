/**
 * GET /api/india/aa/callback
 * Setu redirects here after user approves/rejects consent.
 *
 * Also handles POST webhooks from Setu for async consent/data events.
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { randomUUID } from 'crypto'
import {
  getConsentStatus,
  triggerDataFetch,
  getFetchedData,
  mapAccountToAsset,
  type FIType,
} from '@/lib/india/aa/client'

const BASE_URL = process.env.NEXTAUTH_URL ?? 'https://tijori-xi.vercel.app'

// GET — user redirected back from Setu webview
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const consentId = searchParams.get('id') ?? searchParams.get('consentId') ?? searchParams.get('consent_id')
  const statusParam = searchParams.get('status')

  if (statusParam === 'REJECTED' || statusParam === 'UserCancelled') {
    return NextResponse.redirect(`${BASE_URL}/connections/aa?error=rejected`)
  }

  if (!consentId) {
    return NextResponse.redirect(`${BASE_URL}/connections/aa?error=no_id`)
  }

  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.redirect(`${BASE_URL}/login?callbackUrl=/connections/aa`)
    }

    const userId = session.user.id
    const householdId = (session.user as Record<string, unknown>).householdId as string
      ?? ((await db.execute({ sql: 'SELECT household_id FROM users WHERE id = ?', args: [userId] }))
          .rows[0]?.household_id as string)

    // Check consent status
    const consent = await getConsentStatus(consentId)

    if (consent.status !== 'ACTIVE') {
      return NextResponse.redirect(`${BASE_URL}/connections/aa?error=not_active&status=${consent.status}`)
    }

    // Trigger data fetch
    const session_ = await triggerDataFetch(consentId)

    // Give FIPs time to respond (async — real data via webhook)
    // For now attempt immediate fetch (sandbox responds quickly)
    const fiData = await getFetchedData(consentId).catch(() => [])

    let assetsCreated = 0
    for (const fi of fiData) {
      for (const record of fi.data) {
        const asset = mapAccountToAsset(record, fi.fiType)
        if (asset) {
          await db.execute({
            sql: `INSERT OR IGNORE INTO assets
                    (id, user_id, household_id, name, category, value, currency, institution, notes)
                  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            args: [
              randomUUID(), userId, householdId,
              asset.name, asset.category, asset.value,
              asset.currency, asset.institution, asset.notes,
            ],
          }).catch(() => {})
          assetsCreated++
        }
      }
    }

    // Update consent status
    await db.execute({
      sql: `UPDATE aa_consents SET status = 'READY', consent_id = ?, updated_at = datetime('now')
            WHERE consent_handle = ? AND user_id = ?`,
      args: [consentId, consentId, userId],
    }).catch(() => {})

    return NextResponse.redirect(
      `${BASE_URL}/connections/aa?success=true&assets=${assetsCreated}&session=${session_.id}`
    )
  } catch (err) {
    console.error('[AA callback]', err)
    return NextResponse.redirect(`${BASE_URL}/connections/aa?error=fetch_failed`)
  }
}

// POST — Setu webhook for async events
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { type, consentId, dataSessionId } = body

    console.log('[AA webhook]', type, consentId ?? dataSessionId)

    if (type === 'CONSENT_STATUS_UPDATE' && body.success) {
      await db.execute({
        sql: `UPDATE aa_consents SET status = ? WHERE consent_handle = ?`,
        args: [body.data?.status ?? 'ACTIVE', consentId],
      }).catch(() => {})
    }

    if (type === 'SESSION_STATUS_UPDATE' && body.data?.status === 'COMPLETED') {
      // Data is ready — could trigger background import here
      console.log('[AA webhook] Data session complete:', dataSessionId)
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[AA webhook error]', err)
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 })
  }
}
