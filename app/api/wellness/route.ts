import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import {
  submitCheckin, getLatestCheckin, getCheckinHistory, hasCheckedInThisWeek
} from '@/lib/enterprise/wellness'
import { getUserOrgs } from '@/lib/enterprise/org'

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const [latest, history, checked] = await Promise.all([
    getLatestCheckin(session.user.id),
    getCheckinHistory(session.user.id),
    hasCheckedInThisWeek(session.user.id),
  ])

  return NextResponse.json({ latest, history, checkedInThisWeek: checked })
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { stressScore, checkedFinances, win, focus } = await req.json()

  if (!stressScore || stressScore < 1 || stressScore > 5) {
    return NextResponse.json({ error: 'Stress score must be 1–5' }, { status: 400 })
  }

  // Link to org if user belongs to one
  const orgs = await getUserOrgs(session.user.id)
  const orgId = orgs[0]?.id ?? null

  const checkin = await submitCheckin(session.user.id, orgId, {
    stressScore, checkedFinances: !!checkedFinances, win, focus,
  })

  return NextResponse.json({ checkin })
}
