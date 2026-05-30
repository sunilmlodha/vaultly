import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { calculateVaultScore, getVaultScoreHistory, scoreLabel } from '@/lib/vault-score'
import { saveInAppNotification } from '@/lib/push'
import { db } from '@/lib/db'


// Resolve householdId from session or DB (handles old session tokens)
async function getHouseholdId(userId: string, sessionValue: unknown): Promise<string | null> {
  if (sessionValue && typeof sessionValue === 'string') return sessionValue
  const res = await db.execute({ sql: 'SELECT household_id FROM users WHERE id = ?', args: [userId] })
  return (res.rows[0]?.household_id as string) ?? null
}

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const userId = session.user.id
  const householdId = await getHouseholdId(userId, (session.user as Record<string, unknown>).householdId)

  if (!householdId) {
    return NextResponse.json({ error: 'No household found' }, { status: 400 })
  }

  // Only recalculate if no score today
  const todayRes = await db.execute({
    sql: `SELECT * FROM vault_scores WHERE user_id = ? AND date(created_at) = date('now') ORDER BY created_at DESC LIMIT 1`,
    args: [userId],
  })

  let result
  if (todayRes.rows.length > 0) {
    const r = todayRes.rows[0]
    const { label, colour } = scoreLabel(Number(r.score))

    // Get previous score for trend
    const prevRes = await db.execute({
      sql: `SELECT score FROM vault_scores WHERE user_id = ? AND date(created_at) < date('now') ORDER BY created_at DESC LIMIT 1`,
      args: [userId],
    })
    const prevScore = prevRes.rows.length > 0 ? Number(prevRes.rows[0].score) : null

    result = {
      score: Number(r.score),
      components: {
        net_worth_momentum: Number(r.net_worth_momentum),
        emergency_buffer: Number(r.emergency_buffer),
        goal_velocity: Number(r.goal_velocity),
        debt_health: Number(r.debt_health),
        renewal_control: Number(r.renewal_control),
        engagement: Number(r.engagement),
      },
      trend: prevScore !== null ? Number(r.score) - prevScore : 0,
      label,
      colour,
      netWorth: Number(r.net_worth_snapshot),
      previousNetWorth: prevScore !== null ? Number(r.net_worth_snapshot) : Number(r.net_worth_snapshot),
    }
  } else {
    result = await calculateVaultScore(userId, householdId)

    // Notify on milestone crossings
    const milestones = [300, 450, 600, 750, 850]
    for (const m of milestones) {
      if (result.score >= m && result.trend > 0 && (result.score - result.trend) < m) {
        await saveInAppNotification(
          userId,
          'milestone',
          `🎯 Vault Score milestone: ${m}!`,
          `You've crossed ${m} points — ${result.label}. Keep it up!`,
          '/dashboard'
        )
      }
    }
  }

  const history = await getVaultScoreHistory(userId, 12)

  return NextResponse.json({ vaultScore: result, history })
}
