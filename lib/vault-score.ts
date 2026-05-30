import { db } from './db'
import { randomUUID } from 'crypto'

export interface VaultScoreComponents {
  net_worth_momentum: number  // 0-250
  emergency_buffer: number    // 0-150
  goal_velocity: number       // 0-200
  debt_health: number         // 0-150
  renewal_control: number     // 0-100
  engagement: number          // 0-50
}

export interface VaultScoreResult {
  score: number
  components: VaultScoreComponents
  trend: number           // change vs last score
  label: string           // 'Excellent' | 'Great' | 'Good' | 'Building' | 'Starting'
  colour: string          // tailwind colour class
  netWorth: number
  previousNetWorth: number
}

export function scoreLabel(score: number): { label: string; colour: string } {
  if (score >= 750) return { label: 'Excellent', colour: 'text-emerald-600' }
  if (score >= 600) return { label: 'Great',     colour: 'text-green-500'  }
  if (score >= 450) return { label: 'Good',      colour: 'text-indigo-500' }
  if (score >= 300) return { label: 'Building',  colour: 'text-amber-500'  }
  return                  { label: 'Starting',   colour: 'text-slate-400'  }
}

export async function calculateVaultScore(userId: string, householdId: string): Promise<VaultScoreResult> {
  // Fetch all data in parallel
  const [assetsRes, liabilitiesRes, goalsRes, renewalsRes, docsRes, prevScoreRes] =
    await Promise.all([
      db.execute({
        sql: 'SELECT category, value FROM assets WHERE household_id = ?',
        args: [householdId],
      }),
      db.execute({
        sql: 'SELECT balance FROM liabilities WHERE household_id = ?',
        args: [householdId],
      }),
      db.execute({
        sql: 'SELECT target_amount, current_amount, target_date FROM goals WHERE household_id = ?',
        args: [householdId],
      }),
      db.execute({
        sql: 'SELECT renewal_date, amount, notes FROM renewals WHERE household_id = ?',
        args: [householdId],
      }),
      db.execute({
        sql: 'SELECT COUNT(*) as cnt FROM documents WHERE household_id = ?',
        args: [householdId],
      }),
      // Last two scores for trend
      db.execute({
        sql: 'SELECT score, net_worth_snapshot FROM vault_scores WHERE user_id = ? ORDER BY created_at DESC LIMIT 2',
        args: [userId],
      }),
    ])

  const assets = assetsRes.rows
  const liabilities = liabilitiesRes.rows
  const goals = goalsRes.rows
  const renewals = renewalsRes.rows
  const docCount = Number(docsRes.rows[0]?.cnt ?? 0)

  const totalAssets = assets.reduce((s, a) => s + Number(a.value), 0)
  const totalLiabilities = liabilities.reduce((s, l) => s + Number(l.balance), 0)
  const netWorth = totalAssets - totalLiabilities

  const prevNetWorth = prevScoreRes.rows.length > 0
    ? Number(prevScoreRes.rows[0].net_worth_snapshot)
    : netWorth
  const prevScore = prevScoreRes.rows.length > 0
    ? Number(prevScoreRes.rows[0].score)
    : null

  // ── 1. Net worth momentum (0-250) ─────────────────────────────────────────
  let net_worth_momentum = 0
  if (prevNetWorth > 0 && netWorth > 0) {
    const pct = ((netWorth - prevNetWorth) / Math.abs(prevNetWorth)) * 100
    if (pct >= 5)       net_worth_momentum = 250
    else if (pct >= 3)  net_worth_momentum = 210
    else if (pct >= 1)  net_worth_momentum = 170
    else if (pct >= 0)  net_worth_momentum = 130
    else if (pct >= -2) net_worth_momentum = 80
    else                net_worth_momentum = 30
  } else if (netWorth > 0) {
    net_worth_momentum = 130 // positive net worth, no history yet
  } else {
    net_worth_momentum = 30
  }

  // ── 2. Emergency buffer (0-150) ───────────────────────────────────────────
  // Liquid assets = bank accounts. Monthly expenses estimated from liabilities + renewals
  const liquidAssets = assets
    .filter(a => a.category === 'bank_account')
    .reduce((s, a) => s + Number(a.value), 0)

  const monthlyLiability = liabilities.reduce((s, l) => {
    // Rough monthly cost — assume average liability balance implies ~1% monthly service
    return s + Number(l.balance) * 0.01
  }, 0)
  const monthlyRenewals = renewals.reduce((s, r) => s + Number(r.amount) / 12, 0)
  const estimatedMonthlyExpenses = Math.max(monthlyLiability + monthlyRenewals, 500) // min £500

  const bufferMonths = liquidAssets / estimatedMonthlyExpenses
  let emergency_buffer: number
  if (bufferMonths >= 6)      emergency_buffer = 150
  else if (bufferMonths >= 3) emergency_buffer = 110
  else if (bufferMonths >= 1) emergency_buffer = 70
  else                        emergency_buffer = 20

  // ── 3. Goal velocity (0-200) ──────────────────────────────────────────────
  let goal_velocity = 0
  if (goals.length === 0) {
    goal_velocity = 50 // no goals set yet — partial credit
  } else {
    const now = Date.now()
    let totalProgress = 0
    for (const g of goals) {
      const target = Number(g.target_amount)
      const current = Number(g.current_amount)
      if (target <= 0) continue
      const pct = Math.min(current / target, 1)

      // Bonus for being on-track with target date
      let trackBonus = 1
      if (g.target_date) {
        const daysLeft = (new Date(g.target_date as string).getTime() - now) / 86400000
        if (daysLeft > 0) {
          const expectedPct = 1 - (daysLeft / 365)
          if (pct >= expectedPct) trackBonus = 1.2
        }
      }
      totalProgress += pct * trackBonus
    }
    const avgProgress = totalProgress / goals.length
    goal_velocity = Math.round(Math.min(avgProgress * 200, 200))
  }

  // ── 4. Debt health (0-150) ────────────────────────────────────────────────
  let debt_health = 150
  if (totalAssets > 0) {
    const debtRatio = totalLiabilities / totalAssets
    if (debtRatio >= 0.8)      debt_health = 10
    else if (debtRatio >= 0.6) debt_health = 40
    else if (debtRatio >= 0.4) debt_health = 80
    else if (debtRatio >= 0.2) debt_health = 120
    else                       debt_health = 150
  } else if (totalLiabilities > 0) {
    debt_health = 10
  }

  // ── 5. Renewal control (0-100) ────────────────────────────────────────────
  let renewal_control = 50 // base: no renewals tracked
  if (renewals.length > 0) {
    const now = Date.now()
    let upcoming = 0
    let withNotes = 0
    for (const r of renewals) {
      const daysUntil = (new Date(r.renewal_date as string).getTime() - now) / 86400000
      if (daysUntil <= 30) upcoming++
      if (r.notes) withNotes++
    }
    // More renewals tracked = better control. Notes = active management
    const coverageScore = Math.min(renewals.length / 5, 1) * 60
    const noteScore = renewals.length > 0 ? (withNotes / renewals.length) * 40 : 0
    renewal_control = Math.round(coverageScore + noteScore)
  }

  // ── 6. Engagement (0-50) ──────────────────────────────────────────────────
  let engagement = 0
  if (assets.length > 0)      engagement += 15
  if (goals.length > 0)       engagement += 10
  if (renewals.length > 0)    engagement += 10
  if (docCount > 0)           engagement += 10
  if (liabilities.length > 0) engagement += 5
  engagement = Math.min(engagement, 50)

  const components: VaultScoreComponents = {
    net_worth_momentum,
    emergency_buffer,
    goal_velocity,
    debt_health,
    renewal_control,
    engagement,
  }

  const score = Object.values(components).reduce((s, v) => s + v, 0)
  const { label, colour } = scoreLabel(score)

  // Store score in history
  await db.execute({
    sql: `INSERT INTO vault_scores
            (id, user_id, score, net_worth_momentum, emergency_buffer,
             goal_velocity, debt_health, renewal_control, engagement, net_worth_snapshot)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      randomUUID(), userId, score,
      net_worth_momentum, emergency_buffer, goal_velocity,
      debt_health, renewal_control, engagement, netWorth,
    ],
  })

  return {
    score,
    components,
    trend: prevScore !== null ? score - prevScore : 0,
    label,
    colour,
    netWorth,
    previousNetWorth: prevNetWorth,
  }
}

export async function getLatestVaultScore(userId: string) {
  const res = await db.execute({
    sql: `SELECT * FROM vault_scores WHERE user_id = ? ORDER BY created_at DESC LIMIT 1`,
    args: [userId],
  })
  return res.rows[0] ?? null
}

export async function getVaultScoreHistory(userId: string, limit = 10) {
  const res = await db.execute({
    sql: `SELECT score, net_worth_snapshot, created_at
          FROM vault_scores WHERE user_id = ?
          ORDER BY created_at DESC LIMIT ?`,
    args: [userId, limit],
  })
  return res.rows.reverse() // oldest first for charts
}
