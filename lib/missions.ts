import { db } from './db'
import { randomUUID } from 'crypto'
import { saveInAppNotification } from './push'

// ── Mission definitions ───────────────────────────────────────────────────────

export interface MissionDef {
  id: string
  title: string
  description: string
  icon: string
  xp: number
  type: 'weekly' | 'monthly'
  target: number
  actionType: string
  tip: string
}

const WEEKLY_POOL: MissionDef[] = [
  {
    id: 'add_asset',
    title: 'Asset Hunter',
    description: 'Add a new asset to your vault',
    icon: '💰',
    xp: 15,
    type: 'weekly',
    target: 1,
    actionType: 'assets_created',
    tip: 'Go to Assets → Add new',
  },
  {
    id: 'add_goal',
    title: 'Dream Big',
    description: 'Create a financial goal',
    icon: '🎯',
    xp: 20,
    type: 'weekly',
    target: 1,
    actionType: 'goals_created',
    tip: 'Go to Goals → New goal',
  },
  {
    id: 'add_renewal',
    title: 'Renewal Scout',
    description: 'Track a subscription or renewal',
    icon: '🔔',
    xp: 15,
    type: 'weekly',
    target: 1,
    actionType: 'renewals_created',
    tip: 'Go to Renewals → Add renewal',
  },
  {
    id: 'upload_doc',
    title: 'Paper Trail',
    description: 'Upload a financial document',
    icon: '📄',
    xp: 15,
    type: 'weekly',
    target: 1,
    actionType: 'documents_created',
    tip: 'Go to Documents → Upload',
  },
  {
    id: 'check_in_5',
    title: 'Daily Habit',
    description: 'Open your vault 3 days this week',
    icon: '🔥',
    xp: 25,
    type: 'weekly',
    target: 3,
    actionType: 'checkin_days',
    tip: 'Just open the dashboard each day',
  },
  {
    id: 'add_liability',
    title: 'Know Your Debts',
    description: 'Track a liability or debt',
    icon: '📋',
    xp: 15,
    type: 'weekly',
    target: 1,
    actionType: 'liabilities_created',
    tip: 'Go to Liabilities → Add liability',
  },
  {
    id: 'check_vault_score',
    title: 'Score Check',
    description: 'Get your Vault Score calculated',
    icon: '🏆',
    xp: 10,
    type: 'weekly',
    target: 1,
    actionType: 'vault_score_checked',
    tip: 'Just open the dashboard',
  },
]

const MONTHLY_MISSIONS: MissionDef[] = [
  {
    id: 'monthly_score_gain',
    title: 'Vault Guardian',
    description: 'Increase your Vault Score by 30 points this month',
    icon: '⚡',
    xp: 75,
    type: 'monthly',
    target: 30,
    actionType: 'vault_score_gain',
    tip: 'Add assets, complete goals, track renewals',
  },
  {
    id: 'monthly_goal_progress',
    title: 'Goal Sprint',
    description: 'Reach 50% on any financial goal',
    icon: '🚀',
    xp: 50,
    type: 'monthly',
    target: 1,
    actionType: 'goal_50pct',
    tip: 'Top up one of your goals',
  },
  {
    id: 'monthly_renewals_5',
    title: 'Renewal Master',
    description: 'Have 5 or more renewals tracked',
    icon: '🔄',
    xp: 40,
    type: 'monthly',
    target: 5,
    actionType: 'renewals_total',
    tip: 'Add your subscriptions to Renewals',
  },
]

// Pick 3 weekly missions deterministically by week number
function getWeekNumber(date: Date): number {
  const start = new Date(date.getFullYear(), 0, 1)
  return Math.ceil(((date.getTime() - start.getTime()) / 86400000 + start.getDay() + 1) / 7)
}

export function currentPeriod(type: 'weekly' | 'monthly'): string {
  const now = new Date()
  if (type === 'monthly') {
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  }
  const week = getWeekNumber(now)
  return `${now.getFullYear()}-W${String(week).padStart(2, '0')}`
}

export function getActiveMissions(): MissionDef[] {
  const week = getWeekNumber(new Date())
  // Rotate 3 from pool based on week number
  const weekly = [
    WEEKLY_POOL[week % WEEKLY_POOL.length],
    WEEKLY_POOL[(week + 2) % WEEKLY_POOL.length],
    WEEKLY_POOL[(week + 4) % WEEKLY_POOL.length],
  ]
  return [...weekly, ...MONTHLY_MISSIONS]
}

// ── Progress calculation (lazy — reads from actual DB data) ───────────────────

async function calculateProgress(
  userId: string,
  householdId: string,
  mission: MissionDef,
  period: string
): Promise<number> {
  const now = new Date()

  // Weekly: count actions since start of this week
  const weekStart = new Date(now)
  weekStart.setDate(now.getDate() - now.getDay())
  weekStart.setHours(0, 0, 0, 0)

  // Monthly: count actions since start of this month
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)

  const since = mission.type === 'weekly'
    ? weekStart.toISOString()
    : monthStart.toISOString()

  switch (mission.actionType) {
    case 'assets_created':
      return (await db.execute({
        sql: 'SELECT COUNT(*) as cnt FROM assets WHERE household_id = ? AND created_at >= ?',
        args: [householdId, since],
      })).rows[0]?.cnt as number ?? 0

    case 'goals_created':
      return (await db.execute({
        sql: 'SELECT COUNT(*) as cnt FROM goals WHERE household_id = ? AND created_at >= ?',
        args: [householdId, since],
      })).rows[0]?.cnt as number ?? 0

    case 'renewals_created':
      return (await db.execute({
        sql: 'SELECT COUNT(*) as cnt FROM renewals WHERE household_id = ? AND created_at >= ?',
        args: [householdId, since],
      })).rows[0]?.cnt as number ?? 0

    case 'documents_created':
      return (await db.execute({
        sql: 'SELECT COUNT(*) as cnt FROM documents WHERE household_id = ? AND created_at >= ?',
        args: [householdId, since],
      })).rows[0]?.cnt as number ?? 0

    case 'liabilities_created':
      return (await db.execute({
        sql: 'SELECT COUNT(*) as cnt FROM liabilities WHERE household_id = ? AND created_at >= ?',
        args: [householdId, since],
      })).rows[0]?.cnt as number ?? 0

    case 'checkin_days': {
      // Count distinct checkin days from streak table this week
      const streakRes = await db.execute({
        sql: 'SELECT total_checkins, last_checkin_date FROM streaks WHERE user_id = ?',
        args: [userId],
      })
      if (!streakRes.rows[0]) return 0
      // Approximate: count days in this period from checkins (simplified)
      const userMission = await db.execute({
        sql: 'SELECT progress FROM user_missions WHERE user_id = ? AND mission_id = ? AND period = ?',
        args: [userId, mission.id, period],
      })
      return (userMission.rows[0]?.progress as number) ?? 0
    }

    case 'vault_score_checked':
      return (await db.execute({
        sql: 'SELECT COUNT(*) as cnt FROM vault_scores WHERE user_id = ? AND created_at >= ?',
        args: [userId, since],
      })).rows[0]?.cnt as number ?? 0

    case 'vault_score_gain': {
      const scores = await db.execute({
        sql: 'SELECT score FROM vault_scores WHERE user_id = ? AND created_at >= ? ORDER BY created_at ASC LIMIT 1',
        args: [userId, since],
      })
      const latest = await db.execute({
        sql: 'SELECT score FROM vault_scores WHERE user_id = ? ORDER BY created_at DESC LIMIT 1',
        args: [userId],
      })
      if (!scores.rows[0] || !latest.rows[0]) return 0
      return Math.max(0, Number(latest.rows[0].score) - Number(scores.rows[0].score))
    }

    case 'goal_50pct':
      return (await db.execute({
        sql: `SELECT COUNT(*) as cnt FROM goals WHERE household_id = ? AND target_amount > 0
              AND CAST(current_amount AS REAL) / CAST(target_amount AS REAL) >= 0.5`,
        args: [householdId],
      })).rows[0]?.cnt as number ?? 0

    case 'renewals_total':
      return (await db.execute({
        sql: 'SELECT COUNT(*) as cnt FROM renewals WHERE household_id = ?',
        args: [householdId],
      })).rows[0]?.cnt as number ?? 0

    default:
      return 0
  }
}

// ── Main function — load missions with live progress ──────────────────────────

export async function getMissionsWithProgress(userId: string, householdId: string) {
  const missions = getActiveMissions()

  const results = await Promise.all(
    missions.map(async mission => {
      const period = currentPeriod(mission.type)
      const progress = await calculateProgress(userId, householdId, mission, period)
      const completed = progress >= mission.target

      // Upsert progress + award XP if newly completed
      const existing = await db.execute({
        sql: 'SELECT id, completed, xp_awarded FROM user_missions WHERE user_id = ? AND mission_id = ? AND period = ?',
        args: [userId, mission.id, period],
      })

      if (existing.rows.length === 0) {
        await db.execute({
          sql: `INSERT INTO user_missions (id, user_id, mission_id, period, progress, completed, completed_at, xp_awarded)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          args: [
            randomUUID(), userId, mission.id, period,
            progress, completed ? 1 : 0,
            completed ? new Date().toISOString() : null, 0,
          ],
        })
      } else {
        const wasCompleted = Boolean(existing.rows[0].completed)
        await db.execute({
          sql: `UPDATE user_missions SET progress = ?, completed = ?, completed_at = ?
                WHERE user_id = ? AND mission_id = ? AND period = ?`,
          args: [
            progress, completed ? 1 : 0,
            completed && !wasCompleted ? new Date().toISOString() : existing.rows[0].completed_at,
            userId, mission.id, period,
          ],
        })

        // Award XP + notify if freshly completed
        if (completed && !wasCompleted) {
          await awardXP(userId, mission.xp, `Mission: ${mission.title}`)
          await saveInAppNotification(
            userId, 'milestone',
            `${mission.icon} Mission complete: ${mission.title}!`,
            `You earned ${mission.xp} XP. ${mission.type === 'weekly' ? 'Weekly' : 'Monthly'} mission done!`,
            '/dashboard'
          )
        }
      }

      const pct = Math.min(Math.round((progress / mission.target) * 100), 100)

      // Time remaining
      const now = new Date()
      let expiresAt: Date
      if (mission.type === 'weekly') {
        expiresAt = new Date(now)
        expiresAt.setDate(now.getDate() + (7 - now.getDay()))
        expiresAt.setHours(23, 59, 59, 0)
      } else {
        expiresAt = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59)
      }
      const daysLeft = Math.max(0, Math.ceil((expiresAt.getTime() - now.getTime()) / 86400000))

      return { ...mission, progress, pct, completed, daysLeft, period }
    })
  )

  return results
}

export async function awardXP(userId: string, amount: number, reason: string) {
  await db.batch([
    {
      sql: 'INSERT INTO xp_events (id, user_id, amount, reason) VALUES (?, ?, ?, ?)',
      args: [randomUUID(), userId, amount, reason],
    },
    {
      sql: `UPDATE users SET total_xp = total_xp + ?,
            level = MAX(1, CAST((total_xp + ?) / 100 AS INTEGER) + 1)
            WHERE id = ?`,
      args: [amount, amount, userId],
    },
  ])
}

export function xpToNextLevel(totalXp: number): { level: number; xpInLevel: number; xpNeeded: number; pct: number } {
  const level = Math.floor(totalXp / 100) + 1
  const xpInLevel = totalXp % 100
  const xpNeeded = 100
  return { level, xpInLevel, xpNeeded, pct: Math.round((xpInLevel / xpNeeded) * 100) }
}
