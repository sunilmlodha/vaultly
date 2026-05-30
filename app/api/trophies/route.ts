import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { getUserTrophies, checkAndAwardTrophies } from '@/lib/trophies'
import { db } from '@/lib/db'

// GET — fast display-only path (just reads what's already earned + definitions)
// checkAndAwardTrophies is intentionally NOT called here to avoid timeouts.
// Trophies are checked/awarded lazily via POST /api/trophies/check.
export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const userId = session.user.id
  const householdId = (session.user as Record<string, unknown>).householdId as string
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

// POST — runs the full trophy check (call this on actions, not on every page load)
export async function POST() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const userId = session.user.id
  const householdId = (session.user as Record<string, unknown>).householdId as string
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
