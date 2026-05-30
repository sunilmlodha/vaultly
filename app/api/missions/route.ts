import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { getMissionsWithProgress, xpToNextLevel } from '@/lib/missions'
import { db } from '@/lib/db'

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const userId = session.user.id
  const householdId = (session.user as Record<string, unknown>).householdId as string
  if (!householdId) return NextResponse.json({ error: 'No household' }, { status: 400 })

  const missions = await getMissionsWithProgress(userId, householdId)

  const userRes = await db.execute({
    sql: 'SELECT total_xp, level FROM users WHERE id = ?',
    args: [userId],
  })
  const totalXp = Number(userRes.rows[0]?.total_xp ?? 0)
  const xpInfo = xpToNextLevel(totalXp)

  return NextResponse.json({ missions, xp: { total: totalXp, ...xpInfo } })
}
