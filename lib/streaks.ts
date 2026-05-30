import { db } from './db'
import { randomUUID } from 'crypto'
import { saveInAppNotification } from './push'
import { awardXP } from './missions'

export interface StreakData {
  currentStreak: number
  longestStreak: number
  lastCheckinDate: string | null
  freezeTokens: number
  totalCheckins: number
  checkedInToday: boolean
  milestoneReached: number | null
}

const STREAK_MILESTONES = [3, 7, 14, 30, 60, 100, 365]
const STREAK_XP: Record<number, number> = { 3: 15, 7: 40, 14: 75, 30: 150, 60: 250, 100: 500, 365: 1000 }

function todayStr(): string {
  return new Date().toISOString().split('T')[0]
}

function yesterdayStr(): string {
  const d = new Date()
  d.setDate(d.getDate() - 1)
  return d.toISOString().split('T')[0]
}

export async function recordCheckin(userId: string): Promise<StreakData> {
  const today = todayStr()
  const yesterday = yesterdayStr()

  const res = await db.execute({
    sql: 'SELECT * FROM streaks WHERE user_id = ?',
    args: [userId],
  })

  let milestoneReached: number | null = null

  if (res.rows.length === 0) {
    // First ever check-in
    await db.execute({
      sql: `INSERT INTO streaks (id, user_id, current_streak, longest_streak, last_checkin_date, freeze_tokens, total_checkins)
            VALUES (?, ?, 1, 1, ?, 0, 1)`,
      args: [randomUUID(), userId, today],
    })
    await awardXP(userId, 5, 'Daily check-in')
    return {
      currentStreak: 1, longestStreak: 1, lastCheckinDate: today,
      freezeTokens: 0, totalCheckins: 1, checkedInToday: true, milestoneReached: null,
    }
  }

  const row = res.rows[0]
  const lastDate = row.last_checkin_date as string | null
  let current = Number(row.current_streak)
  let longest = Number(row.longest_streak)
  let tokens = Number(row.freeze_tokens)
  let total = Number(row.total_checkins)

  // Already checked in today — return current state
  if (lastDate === today) {
    return {
      currentStreak: current, longestStreak: longest, lastCheckinDate: lastDate,
      freezeTokens: tokens, totalCheckins: total, checkedInToday: true, milestoneReached: null,
    }
  }

  // Consecutive day — extend streak
  if (lastDate === yesterday) {
    current += 1
    longest = Math.max(longest, current)
    total += 1

    // Check milestones
    for (const m of STREAK_MILESTONES) {
      if (current === m) {
        milestoneReached = m
        await awardXP(userId, STREAK_XP[m], `Streak milestone: ${m} days`)
        await saveInAppNotification(
          userId, 'milestone',
          `🔥 ${m}-day streak!`,
          `You've opened your vault ${m} days in a row. ${STREAK_XP[m]} XP earned!`,
          '/dashboard'
        )
      }
    }
  } else if (tokens > 0 && lastDate) {
    // Missed a day but has freeze token
    const daysMissed = Math.floor(
      (new Date(today).getTime() - new Date(lastDate).getTime()) / 86400000
    )
    if (daysMissed === 2) {
      tokens -= 1
      current += 1 // keep streak going
      total += 1
    } else {
      // Gap too large — reset
      current = 1
      total += 1
    }
  } else {
    // Streak broken
    current = 1
    total += 1
  }

  await db.execute({
    sql: `UPDATE streaks
          SET current_streak = ?, longest_streak = ?, last_checkin_date = ?,
              freeze_tokens = ?, total_checkins = ?, updated_at = datetime('now')
          WHERE user_id = ?`,
    args: [current, longest, today, tokens, total, userId],
  })

  await awardXP(userId, 5, 'Daily check-in')

  return {
    currentStreak: current, longestStreak: longest, lastCheckinDate: today,
    freezeTokens: tokens, totalCheckins: total, checkedInToday: true, milestoneReached,
  }
}

export async function getStreak(userId: string): Promise<StreakData> {
  const res = await db.execute({
    sql: 'SELECT * FROM streaks WHERE user_id = ?',
    args: [userId],
  })
  if (res.rows.length === 0) {
    return { currentStreak: 0, longestStreak: 0, lastCheckinDate: null, freezeTokens: 0, totalCheckins: 0, checkedInToday: false, milestoneReached: null }
  }
  const row = res.rows[0]
  const today = todayStr()
  return {
    currentStreak: Number(row.current_streak),
    longestStreak: Number(row.longest_streak),
    lastCheckinDate: row.last_checkin_date as string,
    freezeTokens: Number(row.freeze_tokens),
    totalCheckins: Number(row.total_checkins),
    checkedInToday: row.last_checkin_date === today,
    milestoneReached: null,
  }
}

export async function addFreezeToken(userId: string) {
  await db.execute({
    sql: `UPDATE streaks SET freeze_tokens = MIN(freeze_tokens + 1, 3) WHERE user_id = ?`,
    args: [userId],
  })
}
