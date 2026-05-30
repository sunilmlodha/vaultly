import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { getEligibleNudges, logNudgeShown, logNudgeClick, logNudgeDismiss } from '@/lib/referrals/engine'

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const userId = session.user.id
    const householdId = (session.user as Record<string, unknown>).householdId as string
    if (!householdId) {
      console.error('[referrals] No householdId in session for user', userId)
      return NextResponse.json({ nudges: [] })
    }

    const nudges = await getEligibleNudges(userId, householdId, 3)

    // Log shown (fire-and-forget, don't block response)
    Promise.allSettled(
      nudges.map(n => logNudgeShown(userId, n.triggerKey, n.partnerId, n.triggerData))
    ).catch(e => console.error('[referrals] logNudgeShown error:', e))

    return NextResponse.json({ nudges })
  } catch (err) {
    console.error('[referrals] GET error:', err)
    return NextResponse.json({ nudges: [], error: String(err) })
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { triggerKey, action } = await req.json()
    if (!triggerKey || !action) return NextResponse.json({ error: 'triggerKey and action required' }, { status: 400 })

    if (action === 'click') {
      await logNudgeClick(session.user.id, triggerKey)
    } else if (action === 'dismiss') {
      await logNudgeDismiss(session.user.id, triggerKey)
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[referrals] POST error:', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
