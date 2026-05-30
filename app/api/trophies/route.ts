import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { getUserTrophies, checkAndAwardTrophies } from '@/lib/trophies'
import { db } from '@/lib/db'

// Resolve householdId — falls back to DB lookup for old session tokens
async function getHouseholdId(userId: string, sessionValue: unknown): Promise<string | null> {
  if (sessionValue && typeof sessionValue === 'string') return sessionValue
  const res = await db.execute({
    sql: 'SELECT household_id FROM users WHERE id = ?',
    args: [userId],
  })
  return (res.rows[0]?.household_id as string) ?? null
}

// GET — fast display-only (reads earned trophies + definitions)
export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const userId = session.user.id
  const householdId = await getHouseholdId(
    userId,
    (session.user as Record<string, unknown>).householdId
  )

  if (!householdId) return NextResponse.json({ error: 'No household' }, { status: 400 })

  const [trophies, xpRes] = await Promise.all([
    getUserTrophies(userId),
    db.execute({ sql: 'SELECT total_xp, level FROM users WHERE id = ?', args: [userId] }),
  ])

  const totalXp = Number(xpRes.rows[0]?.total_xp ?? 0)

  return NextResponse.json({
    ...trophies,
    newlyEarned: [],
    xp: { total: totalXp, level: Number(xpRes.rows[0]?.level ?? 1) },
  })
}

// POST — full trophy check (expensive, runs in background)
export async function POST() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const userId = session.user.id
  const householdId = await getHouseholdId(
    userId,
    (session.user as Record<string, unknown>).householdId
  )

  if (!householdId) return NextResponse.json({ error: 'No household' }, { status: 400 })

  const [scoreRes, streakRes, netWorthRes] = await Promise.all([
    db.execute({ sql: 'SELECT score FROM vault_scores WHERE user_id = ? ORDER BY created_at DESC LIMIT 1', args: [userId] }),
    db.execute({ sql: 'SELECT current_streak FROM streaks WHERE user_id = ?', args: [userId] }),
    db.execute({
      sql: `SELECT COALESCE(SUM(a.value),0) - COALESCE(SUM(l.balance),0) as nw
            FROM (SELECT COALESCE(SUM(value),0) as value FROM assets WHERE household_id = ?) a,
                 (SELECT COALESCE(SUM(balance),0) as balance FROM liabilities WHERE household_id = ?) l`,
      args: [householdId, householdId],
    }).catch(() => ({ rows: [{ nw: 0 }] })),
  ])

  const newlyEarned = await checkAndAwardTrophies(userId, householdId, {
    netWorth: Number(netWorthRes.rows[0]?.nw ?? 0),
    vaultScore: scoreRes.rows[0] ? Number(scoreRes.rows[0].score) : undefined,
    currentStreak: streakRes.rows[0] ? Number(streakRes.rows[0].current_streak) : 0,
  })

  const trophies = await getUserTrophies(userId)
  return NextResponse.json({ ...trophies, newlyEarned })
}
