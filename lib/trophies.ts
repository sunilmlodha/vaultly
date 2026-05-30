import { db } from './db'
import { randomUUID } from 'crypto'
import { saveInAppNotification } from './push'
import { awardXP } from './missions'

export interface TrophyDef {
  id: string
  title: string
  description: string
  icon: string
  category: 'wealth' | 'score' | 'goals' | 'debt' | 'renewals' | 'streaks' | 'missions' | 'documents' | 'family'
  xp: number
  secret?: boolean  // hidden until earned
}

export const TROPHY_DEFS: TrophyDef[] = [
  // ── Wealth ──
  { id: 'first_asset',     title: 'First Step',        description: 'Add your first asset',           icon: '🌱', category: 'wealth',   xp: 10 },
  { id: 'net_worth_pos',   title: 'In the Green',      description: 'Achieve positive net worth',     icon: '💚', category: 'wealth',   xp: 20 },
  { id: 'net_worth_10k',   title: 'Foundation Stone',  description: 'Reach £10,000 net worth',        icon: '🏗️', category: 'wealth',   xp: 50 },
  { id: 'net_worth_50k',   title: 'Rising Star',       description: 'Reach £50,000 net worth',        icon: '⭐', category: 'wealth',   xp: 100 },
  { id: 'net_worth_100k',  title: 'Six Figure Club',   description: 'Reach £100,000 net worth',       icon: '💎', category: 'wealth',   xp: 200, secret: true },
  { id: 'emergency_fund',  title: 'Safety Net',        description: 'Build a 3-month emergency fund', icon: '🛡️', category: 'wealth',   xp: 75 },

  // ── Vault Score ──
  { id: 'vault_300',       title: 'Getting Started',   description: 'Vault Score reaches 300',        icon: '🔑', category: 'score',    xp: 20 },
  { id: 'vault_450',       title: 'Building Momentum', description: 'Vault Score reaches 450',        icon: '🚀', category: 'score',    xp: 40 },
  { id: 'vault_600',       title: 'Century Club',      description: 'Vault Score reaches 600',        icon: '🏆', category: 'score',    xp: 75 },
  { id: 'vault_750',       title: 'Vault Elite',       description: 'Vault Score reaches 750',        icon: '💎', category: 'score',    xp: 150, secret: true },

  // ── Goals ──
  { id: 'first_goal',      title: 'Dream Big',         description: 'Create your first goal',         icon: '🎯', category: 'goals',    xp: 10 },
  { id: 'goal_50pct',      title: 'Halfway There',     description: 'Reach 50% on any goal',          icon: '🎪', category: 'goals',    xp: 30 },
  { id: 'goal_complete',   title: 'Goal Crusher',      description: 'Complete a financial goal',      icon: '✅', category: 'goals',    xp: 100 },

  // ── Debt ──
  { id: 'first_liability', title: 'Know Your Debts',   description: 'Track your first liability',     icon: '📋', category: 'debt',     xp: 10 },
  { id: 'liability_paid',  title: 'Debt Slayer',       description: 'Fully pay off a liability',      icon: '⚔️', category: 'debt',     xp: 100, secret: true },

  // ── Renewals ──
  { id: 'first_renewal',   title: 'Stay Alert',        description: 'Track your first renewal',       icon: '🔔', category: 'renewals', xp: 10 },
  { id: 'renewals_5',      title: 'Renewal Master',    description: 'Track 5 renewals',               icon: '🔄', category: 'renewals', xp: 30 },
  { id: 'renewal_negotiated', title: 'Negotiator',     description: 'Negotiate a renewal',            icon: '🤝', category: 'renewals', xp: 50 },

  // ── Streaks ──
  { id: 'streak_3',        title: 'Getting Warm',      description: '3-day login streak',             icon: '🔥', category: 'streaks',  xp: 15 },
  { id: 'streak_7',        title: 'On Fire',           description: '7-day login streak',             icon: '🔥', category: 'streaks',  xp: 40 },
  { id: 'streak_30',       title: 'Monthly Champion',  description: '30-day login streak',            icon: '🏆', category: 'streaks',  xp: 150, secret: true },

  // ── Missions ──
  { id: 'first_mission',   title: 'Mission Accepted',  description: 'Complete your first mission',    icon: '✅', category: 'missions', xp: 20 },
  { id: 'missions_10',     title: 'Veteran',           description: 'Complete 10 missions',           icon: '🎖️', category: 'missions', xp: 100, secret: true },

  // ── Documents ──
  { id: 'first_document',  title: 'Paper Trail',       description: 'Upload your first document',     icon: '📄', category: 'documents', xp: 15 },

  // ── Family ──
  { id: 'family_member',   title: 'Family Vault',      description: 'Add a household member',         icon: '👨‍👩‍👧', category: 'family', xp: 25 },
]

// ── Check which trophies user should earn ─────────────────────────────────────

export async function checkAndAwardTrophies(
  userId: string,
  householdId: string,
  context: {
    netWorth?: number
    vaultScore?: number
    currentStreak?: number
  } = {}
): Promise<TrophyDef[]> {
  // Get already-earned trophies
  const earned = await db.execute({
    sql: 'SELECT trophy_id FROM user_trophies WHERE user_id = ?',
    args: [userId],
  })
  const earnedIds = new Set(earned.rows.map(r => r.trophy_id as string))

  // Fetch counts we need
  const [assetsRes, goalsRes, liabsRes, renewalsRes, docsRes, familyRes,
         scoreRes, missionsRes, negotiationsRes] = await Promise.all([
    db.execute({ sql: 'SELECT COUNT(*) as cnt FROM assets WHERE household_id = ?', args: [householdId] }),
    db.execute({ sql: `SELECT target_amount, current_amount FROM goals WHERE household_id = ?`, args: [householdId] }),
    db.execute({ sql: 'SELECT balance FROM liabilities WHERE household_id = ?', args: [householdId] }),
    db.execute({ sql: 'SELECT COUNT(*) as cnt FROM renewals WHERE household_id = ?', args: [householdId] }),
    db.execute({ sql: 'SELECT COUNT(*) as cnt FROM documents WHERE household_id = ?', args: [householdId] }),
    db.execute({ sql: `SELECT COUNT(*) as cnt FROM household_members WHERE household_id = ? AND user_id != ?`, args: [householdId, userId] }),
    db.execute({ sql: 'SELECT score FROM vault_scores WHERE user_id = ? ORDER BY created_at DESC LIMIT 1', args: [userId] }),
    db.execute({ sql: 'SELECT COUNT(*) as cnt FROM user_missions WHERE user_id = ? AND completed = 1', args: [userId] }),
    db.execute({ sql: `SELECT COUNT(*) as cnt FROM renewal_negotiations WHERE user_id = ?`, args: [userId] }).catch(() => ({ rows: [{ cnt: 0 }] })),
  ])

  const assetCount    = Number(assetsRes.rows[0]?.cnt ?? 0)
  const renewalCount  = Number(renewalsRes.rows[0]?.cnt ?? 0)
  const docCount      = Number(docsRes.rows[0]?.cnt ?? 0)
  const familyCount   = Number(familyRes.rows[0]?.cnt ?? 0)
  const missionsDone  = Number(missionsRes.rows[0]?.cnt ?? 0)
  const negotiated    = Number(negotiationsRes.rows[0]?.cnt ?? 0)
  const vaultScore    = context.vaultScore ?? (scoreRes.rows[0] ? Number(scoreRes.rows[0].score) : 0)
  const streak        = context.currentStreak ?? 0

  const goals = goalsRes.rows
  const liabilities = liabsRes.rows
  const totalAssets = (await db.execute({ sql: 'SELECT SUM(value) as total FROM assets WHERE household_id = ?', args: [householdId] })).rows[0]?.total as number ?? 0
  const totalLiabs  = liabilities.reduce((s, l) => s + Number(l.balance), 0)
  const netWorth    = context.netWorth ?? (totalAssets - totalLiabs)

  const liquidAssets = (await db.execute({
    sql: `SELECT COALESCE(SUM(value),0) as total FROM assets WHERE household_id = ? AND category = 'bank_account'`,
    args: [householdId],
  })).rows[0]?.total as number ?? 0

  // Monthly expenses estimate
  const monthlyLiab = liabilities.reduce((s, l) => s + Number(l.balance) * 0.01, 0)
  const bufferMonths = monthlyLiab > 0 ? liquidAssets / Math.max(monthlyLiab, 500) : 0

  const goalComplete = goals.some(g =>
    Number(g.target_amount) > 0 && Number(g.current_amount) >= Number(g.target_amount)
  )
  const goal50pct = goals.some(g =>
    Number(g.target_amount) > 0 &&
    Number(g.current_amount) / Number(g.target_amount) >= 0.5
  )
  const debtPaidOff = liabilities.some(l => Number(l.balance) === 0)

  // Condition map
  const conditions: Record<string, boolean> = {
    first_asset:       assetCount >= 1,
    net_worth_pos:     netWorth > 0,
    net_worth_10k:     netWorth >= 10000,
    net_worth_50k:     netWorth >= 50000,
    net_worth_100k:    netWorth >= 100000,
    emergency_fund:    bufferMonths >= 3,
    vault_300:         vaultScore >= 300,
    vault_450:         vaultScore >= 450,
    vault_600:         vaultScore >= 600,
    vault_750:         vaultScore >= 750,
    first_goal:        goals.length >= 1,
    goal_50pct:        goal50pct,
    goal_complete:     goalComplete,
    first_liability:   liabilities.length >= 1,
    liability_paid:    debtPaidOff,
    first_renewal:     renewalCount >= 1,
    renewals_5:        renewalCount >= 5,
    renewal_negotiated: negotiated >= 1,
    streak_3:          streak >= 3,
    streak_7:          streak >= 7,
    streak_30:         streak >= 30,
    first_mission:     missionsDone >= 1,
    missions_10:       missionsDone >= 10,
    first_document:    docCount >= 1,
    family_member:     familyCount >= 1,
  }

  const newlyEarned: TrophyDef[] = []

  for (const trophy of TROPHY_DEFS) {
    if (earnedIds.has(trophy.id)) continue
    if (!conditions[trophy.id]) continue

    // Award trophy
    await db.execute({
      sql: 'INSERT OR IGNORE INTO user_trophies (id, user_id, trophy_id) VALUES (?, ?, ?)',
      args: [randomUUID(), userId, trophy.id],
    })

    await awardXP(userId, trophy.xp, `Trophy: ${trophy.title}`)

    await saveInAppNotification(
      userId, 'milestone',
      `${trophy.icon} Trophy unlocked: ${trophy.title}!`,
      `${trophy.description} — +${trophy.xp} XP`,
      '/achievements'
    )

    newlyEarned.push(trophy)
  }

  return newlyEarned
}

export async function getUserTrophies(userId: string): Promise<{
  earned: (TrophyDef & { earned_at: string })[]
  locked: TrophyDef[]
  total: number
  earnedCount: number
}> {
  const res = await db.execute({
    sql: 'SELECT trophy_id, earned_at FROM user_trophies WHERE user_id = ? ORDER BY earned_at DESC',
    args: [userId],
  })
  const earnedMap = new Map(res.rows.map(r => [r.trophy_id as string, r.earned_at as string]))

  const earned = TROPHY_DEFS
    .filter(t => earnedMap.has(t.id))
    .map(t => ({ ...t, earned_at: earnedMap.get(t.id)! }))
    .sort((a, b) => b.earned_at.localeCompare(a.earned_at))

  const locked = TROPHY_DEFS
    .filter(t => !earnedMap.has(t.id) && !t.secret)

  return { earned, locked, total: TROPHY_DEFS.length, earnedCount: earned.length }
}
