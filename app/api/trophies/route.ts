import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { getUserTrophies, checkAndAwardTrophies } from '@/lib/trophies'
import { db } from '@/lib/db'

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const userId = session.user.id
  const householdId = (session.user as Record<string, unknown>).householdId as string
  if (!householdId) return NextResponse.json({ error: 'No household' }, { status: 400 })

  // Get latest vault score and streak for context
  const [scoreRes, streakRes] = await Promise.all([
    db.execute({ sql: 'SELECT score FROM vault_scores WHERE user_id = ? ORDER BY created_at DESC LIMIT 1', args: [userId] }),
    db.execute({ sql: 'SELECT current_streak FROM streaks WHERE user_id = ?', args: [userId] }),
  ])

  const netWorthRes = await db.execute({
    sql: `SELECT COALESCE(SUM(a.value),0) - COALESCE(SUM(l.balance),0) as nw
          FROM (SELECT COALESCE(SUM(value),0) as value FROM assets WHERE household_id = ?) a,
               (SELECT COALESCE(SUM(balance),0) as balance FROM liabilities WHERE household_id = ?) l`,
    args: [householdId, householdId],
  }).catch(() => ({ rows: [{ nw: 0 }] }))

  // Check + award any new trophies
  const newlyEarned = await checkAndAwardTrophies(userId, householdId, {
    netWorth: Number(netWorthRes.rows[0]?.nw ?? 0),
    vaultScore: scoreRes.rows[0] ? Number(scoreRes.rows[0].score) : undefined,
    currentStreak: streakRes.rows[0] ? Number(streakRes.rows[0].current_streak) : 0,
  })

  const trophies = await getUserTrophies(userId)

  return NextResponse.json({ ...trophies, newlyEarned })
}
