/**
 * GET /api/india/aa/callback
 * Finvu redirects here after user approves/rejects consent.
 * Query params: consentHandle, status (READY|REJECTED), consentId
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import {
  getConsentStatus,
  createDataSession,
  fetchFIData,
  mapDepositToAsset,
  mapMutualFundToAsset,
  type FIType,
} from '@/lib/india/aa/client'
import { randomUUID } from 'crypto'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const consentHandle = searchParams.get('consentHandle')
  const statusParam = searchParams.get('status')
  const consentId = searchParams.get('consentId')

  const baseUrl = process.env.NEXTAUTH_URL ?? 'https://tijori-xi.vercel.app'

  // Demo mode (sandbox without Finvu credentials)
  if (searchParams.get('demo') === 'true') {
    return NextResponse.redirect(`${baseUrl}/connections/aa?demo=success`)
  }

  if (!consentHandle) {
    return NextResponse.redirect(`${baseUrl}/connections/aa?error=no_handle`)
  }

  if (statusParam === 'REJECTED') {
    return NextResponse.redirect(`${baseUrl}/connections/aa?error=rejected`)
  }

  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.redirect(`${baseUrl}/login?callbackUrl=/connections/aa`)
    }

    const userId = session.user.id
    const householdId = (session.user as Record<string, unknown>).householdId as string
      ?? (await db.execute({ sql: 'SELECT household_id FROM users WHERE id = ?', args: [userId] })).rows[0]?.household_id as string

    // Check consent status with Finvu
    const status = await getConsentStatus(consentHandle)

    if (status.status !== 'READY' || !status.consentId) {
      return NextResponse.redirect(`${baseUrl}/connections/aa?error=not_ready`)
    }

    // Get the FI types from our stored consent
    const consentRow = await db.execute({
      sql: 'SELECT fi_types FROM aa_consents WHERE consent_handle = ? AND user_id = ?',
      args: [consentHandle, userId],
    }).catch(() => ({ rows: [] }))

    const fiTypes: FIType[] = consentRow.rows[0]
      ? JSON.parse(consentRow.rows[0].fi_types as string)
      : ['DEPOSIT', 'MUTUAL_FUNDS']

    const now = new Date()
    const fromDate = new Date(now)
    fromDate.setFullYear(fromDate.getFullYear() - 2)

    // Create data session
    const session_ = await createDataSession(
      status.consentId,
      fiTypes,
      {
        from: fromDate.toISOString().split('T')[0],
        to: now.toISOString().split('T')[0],
      }
    )

    // Fetch financial data
    const fiData = await fetchFIData(session_.sessionId)

    // Map to Vaultly assets and save
    let assetsCreated = 0
    for (const fi of fiData) {
      for (const record of fi.data) {
        let asset = null
        if (fi.fiType === 'DEPOSIT') {
          asset = mapDepositToAsset(record as Record<string, unknown>)
        } else if (fi.fiType === 'MUTUAL_FUNDS') {
          asset = mapMutualFundToAsset(record as Record<string, unknown>)
        }

        if (asset && asset.value > 0) {
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
      args: [status.consentId, consentHandle, userId],
    }).catch(() => {})

    return NextResponse.redirect(
      `${baseUrl}/connections/aa?success=true&assets=${assetsCreated}`
    )
  } catch (err) {
    console.error('[AA callback]', err)
    return NextResponse.redirect(`${baseUrl}/connections/aa?error=fetch_failed`)
  }
}
