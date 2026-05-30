import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { getMissionsWithProgress, xpToNextLevel } from '@/lib/missions'
import { db } from '@/lib/db'


// Resolve householdId from session or DB (handles old session tokens)
async function getHouseholdId(userId: string, sessionValue: unknown): Promise<string | null> {
  if (sessionValue && typeof sessionValue === 'string') return sessionValue
  const res = await db.execute({ sql: 'SELECT household_id FROM users WHERE id = ?', args: [userId] })
  return (res.rows[0]?.household_id as string) ?? null
}

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const userId = session.user.id
  const householdId = await getHouseholdId(userId, (session.user as Record<string, unknown>).householdId)
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
