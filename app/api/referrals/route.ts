import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { getEligibleNudges, logNudgeShown, logNudgeClick, logNudgeDismiss } from '@/lib/referrals/engine'

// GET /api/referrals — returns eligible nudges for the current user
export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const userId = session.user.id
  const householdId = (session.user as Record<string, unknown>).householdId as string
  if (!householdId) return NextResponse.json({ nudges: [] })

  const nudges = await getEligibleNudges(userId, householdId, 3)

  // Log that these nudges were shown
  await Promise.allSettled(
    nudges.map(n => logNudgeShown(userId, n.triggerKey, n.partnerId, n.triggerData))
  )

  return NextResponse.json({ nudges })
}

// POST /api/referrals — track click or dismiss
export async function POST(req: NextRequest) {
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
}
