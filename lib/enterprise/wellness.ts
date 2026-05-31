import { db } from '@/lib/db'
import { randomUUID } from 'crypto'

export interface WellnessCheckin {
  id: string
  user_id: string
  org_id: string | null
  week: string
  stress_score: number
  checked_finances: number
  win: string | null
  focus: string | null
  created_at: string
}

function currentWeek(): string {
  const now = new Date()
  const start = new Date(now.getFullYear(), 0, 1)
  const week = Math.ceil(((now.getTime() - start.getTime()) / 86400000 + start.getDay() + 1) / 7)
  return `${now.getFullYear()}-W${String(week).padStart(2, '0')}`
}

export async function submitCheckin(
  userId: string,
  orgId: string | null,
  data: { stressScore: number; checkedFinances: boolean; win?: string; focus?: string }
): Promise<WellnessCheckin> {
  const week = currentWeek()
  const id = randomUUID()

  await db.execute({
    sql: `INSERT INTO wellness_checkins
            (id, user_id, org_id, week, stress_score, checked_finances, win, focus)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT (user_id, week) DO UPDATE SET
            stress_score = excluded.stress_score,
            checked_finances = excluded.checked_finances,
            win = excluded.win,
            focus = excluded.focus`,
    args: [
      id, userId, orgId ?? null, week,
      data.stressScore,
      data.checkedFinances ? 1 : 0,
      data.win ?? null,
      data.focus ?? null,
    ],
  })

  const res = await db.execute({
    sql: 'SELECT * FROM wellness_checkins WHERE user_id = ? AND week = ?',
    args: [userId, week],
  })
  return res.rows[0] as unknown as WellnessCheckin
}

export async function getLatestCheckin(userId: string): Promise<WellnessCheckin | null> {
  const res = await db.execute({
    sql: 'SELECT * FROM wellness_checkins WHERE user_id = ? ORDER BY created_at DESC LIMIT 1',
    args: [userId],
  })
  return (res.rows[0] as unknown as WellnessCheckin) ?? null
}

export async function getCheckinHistory(userId: string, limit = 12) {
  const res = await db.execute({
    sql: `SELECT week, stress_score, checked_finances, win, focus, created_at
          FROM wellness_checkins WHERE user_id = ?
          ORDER BY week DESC LIMIT ?`,
    args: [userId, limit],
  })
  return res.rows.reverse()
}

export async function hasCheckedInThisWeek(userId: string): Promise<boolean> {
  const week = currentWeek()
  const res = await db.execute({
    sql: 'SELECT id FROM wellness_checkins WHERE user_id = ? AND week = ?',
    args: [userId, week],
  })
  return res.rows.length > 0
}

export function stressLabel(score: number): { label: string; emoji: string; colour: string } {
  if (score <= 1) return { label: 'Very calm',    emoji: '😌', colour: 'text-emerald-600' }
  if (score <= 2) return { label: 'Manageable',   emoji: '🙂', colour: 'text-green-500' }
  if (score <= 3) return { label: 'Some pressure',emoji: '😐', colour: 'text-amber-500' }
  if (score <= 4) return { label: 'Stressed',      emoji: '😟', colour: 'text-orange-500' }
  return               { label: 'Very stressed',   emoji: '😰', colour: 'text-red-500' }
}
