import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { recordCheckin, getStreak } from '@/lib/streaks'

// GET — fetch current streak (no side effects)
export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const streak = await getStreak(session.user.id)
  return NextResponse.json({ streak })
}

// POST — record a check-in (called on dashboard load)
export async function POST() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const streak = await recordCheckin(session.user.id)
  return NextResponse.json({ streak })
}
