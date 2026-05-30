/**
 * Referral Engine
 *
 * Evaluates a user's financial data against a set of rules and returns
 * a ranked list of referral nudges to show. Each nudge is triggered only
 * when the user's data genuinely supports the recommendation.
 *
 * Rules are pure functions — no DB calls, fully testable.
 */

import { db } from '@/lib/db'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface UserFinancialSnapshot {
  userId: string
  householdId: string
  totalAssets: number
  totalLiabilities: number
  netWorth: number
  liquidCash: number           // bank_account category assets
  monthlyExpenses: number      // estimated from liabilities + renewals
  emergencyBufferMonths: number
  hasPension: boolean
  hasInvestments: boolean      // isa_ss, investment, etf, bonds
  hasProperty: boolean
  hasIdleCash: boolean         // cash > 6 months expenses
  mortgageRenewalDays: number | null  // days until nearest mortgage renewal
  insuranceRenewalDays: number | null
  goals: Array<{ name: string; target: number; current: number; targetDate: string | null }>
  vaultScore: number
  currency: string
}

export interface ReferralNudge {
  triggerKey: string
  priority: number             // 1 = highest
  partnerId: string
  headline: string
  body: string
  cta: string
  url: string
  category: string
  riskWarning: string | null
  estimatedCommission: number
  triggerData: Record<string, unknown>
}

// ── Rule definitions ──────────────────────────────────────────────────────────

type Rule = {
  key: string
  partnerId: string
  priority: number
  evaluate: (s: UserFinancialSnapshot) => ReferralNudge | null
}

const RULES: Rule[] = [
  // ── Idle cash → invest ──
  {
    key: 'idle_cash_invest',
    partnerId: 'vanguard',
    priority: 1,
    evaluate: (s) => {
      if (!s.hasIdleCash || s.liquidCash < 5000) return null
      const surplus = Math.round(s.liquidCash - s.emergencyBufferMonths * s.monthlyExpenses)
      if (surplus < 3000) return null
      return {
        triggerKey: 'idle_cash_invest',
        priority: 1,
        partnerId: 'vanguard',
        headline: `£${surplus.toLocaleString()} is sitting idle`,
        body: `Your emergency fund is covered. This £${surplus.toLocaleString()} could grow significantly in a Stocks & Shares ISA — the UK tax-free wrapper.`,
        cta: 'Start investing with Vanguard',
        url: 'https://www.vanguardinvestor.co.uk/?utm_source=vaultly&utm_campaign=idle_cash',
        category: 'investment',
        riskWarning: 'The value of investments can go down as well as up.',
        estimatedCommission: 80,
        triggerData: { liquidCash: s.liquidCash, surplus },
      }
    },
  },

  // ── Large idle cash → HL ──
  {
    key: 'idle_cash_hl',
    partnerId: 'hl',
    priority: 2,
    evaluate: (s) => {
      if (!s.hasIdleCash || s.liquidCash < 20000) return null
      return {
        triggerKey: 'idle_cash_hl',
        priority: 2,
        partnerId: 'hl',
        headline: 'Over £20k in cash?',
        body: `With £${s.liquidCash.toLocaleString()} in cash, you could be building long-term wealth. Hargreaves Lansdown is the UK's largest investment platform.`,
        cta: 'Open an HL account',
        url: 'https://www.hl.co.uk/?utm_source=vaultly&utm_campaign=large_cash',
        category: 'investment',
        riskWarning: 'Investments can fall as well as rise. You may get back less than you invest.',
        estimatedCommission: 150,
        triggerData: { liquidCash: s.liquidCash },
      }
    },
  },

  // ── No pension ──
  {
    key: 'no_pension',
    partnerId: 'pensionbee',
    priority: 1,
    evaluate: (s) => {
      if (s.hasPension) return null
      return {
        triggerKey: 'no_pension',
        priority: 1,
        partnerId: 'pensionbee',
        headline: 'No pension in your vault',
        body: 'The average UK adult has 3+ forgotten pension pots. PensionBee consolidates them into one plan — our AI can also help trace any you\'ve lost track of.',
        cta: 'Find and consolidate my pensions',
        url: 'https://www.pensionbee.com/?utm_source=vaultly&utm_campaign=no_pension',
        category: 'pension',
        riskWarning: 'Pension values can go down. You may get back less than you put in.',
        estimatedCommission: 200,
        triggerData: { hasPension: false },
      }
    },
  },

  // ── Mortgage renewal approaching ──
  {
    key: 'mortgage_renewal',
    partnerId: 'habito',
    priority: 1,
    evaluate: (s) => {
      if (!s.mortgageRenewalDays || s.mortgageRenewalDays > 120) return null
      const days = s.mortgageRenewalDays
      const urgent = days <= 30
      return {
        triggerKey: 'mortgage_renewal',
        priority: 1,
        partnerId: 'habito',
        headline: urgent
          ? `⚠️ Mortgage renewal in ${days} days`
          : `Mortgage renewal in ${days} days — act now`,
        body: `You can lock in a new rate up to 6 months before your deal ends. Switching now could save £100s per month. Habito compares thousands of deals for free.`,
        cta: 'Compare mortgage deals',
        url: 'https://www.habito.com/?utm_source=vaultly&utm_campaign=renewal',
        category: 'mortgage',
        riskWarning: null,
        estimatedCommission: 400,
        triggerData: { daysUntilRenewal: days },
      }
    },
  },

  // ── Insurance renewal approaching ──
  {
    key: 'insurance_renewal',
    partnerId: 'comparemarket',
    priority: 2,
    evaluate: (s) => {
      if (!s.insuranceRenewalDays || s.insuranceRenewalDays > 30) return null
      return {
        triggerKey: 'insurance_renewal',
        priority: 2,
        partnerId: 'comparemarket',
        headline: `Insurance renewing in ${s.insuranceRenewalDays} days`,
        body: 'Don\'t let it auto-renew. Loyal customers typically pay 43% more than new customers. Compare quotes in 3 minutes.',
        cta: 'Compare insurance quotes',
        url: 'https://www.comparethemarket.com/?utm_source=vaultly&utm_campaign=renewal',
        category: 'insurance',
        riskWarning: null,
        estimatedCommission: 50,
        triggerData: { daysUntilRenewal: s.insuranceRenewalDays },
      }
    },
  },

  // ── Has investments but no pension ──
  {
    key: 'invest_no_pension',
    partnerId: 'ajbell',
    priority: 2,
    evaluate: (s) => {
      if (!s.hasInvestments || s.hasPension) return null
      return {
        triggerKey: 'invest_no_pension',
        priority: 2,
        partnerId: 'ajbell',
        headline: 'You invest but have no pension',
        body: 'A SIPP gives you 25% instant tax relief on contributions — effectively a 25% return before any growth. For a £1,000 contribution, the government adds £250.',
        cta: 'Open a SIPP with AJ Bell',
        url: 'https://www.ajbell.co.uk/?utm_source=vaultly&utm_campaign=invest_no_pension',
        category: 'pension',
        riskWarning: 'Investments can fall in value. You may get back less than invested.',
        estimatedCommission: 150,
        triggerData: { hasInvestments: true, hasPension: false },
      }
    },
  },

  // ── Savings rate low ──
  {
    key: 'low_savings_rate',
    partnerId: 'marcus',
    priority: 3,
    evaluate: (s) => {
      if (s.liquidCash < 2000) return null
      return {
        triggerKey: 'low_savings_rate',
        priority: 3,
        partnerId: 'marcus',
        headline: 'Is your cash earning the best rate?',
        body: `With £${s.liquidCash.toLocaleString()} in savings, a 0.5% better rate earns an extra £${Math.round(s.liquidCash * 0.005).toLocaleString()} a year for zero effort.`,
        cta: 'Check Marcus savings rate',
        url: 'https://www.marcus.co.uk/?utm_source=vaultly&utm_campaign=savings',
        category: 'savings',
        riskWarning: null,
        estimatedCommission: 30,
        triggerData: { liquidCash: s.liquidCash },
      }
    },
  },

  // ── Goal off track ──
  {
    key: 'goal_off_track',
    partnerId: 'nutmeg',
    priority: 2,
    evaluate: (s) => {
      const offTrack = s.goals.find(g => {
        if (!g.targetDate || g.target <= 0) return false
        const daysLeft = (new Date(g.targetDate).getTime() - Date.now()) / 86400000
        if (daysLeft < 30) return false
        const expectedPct = 1 - daysLeft / 365
        const actualPct = g.current / g.target
        return expectedPct > actualPct + 0.1 // more than 10% behind pace
      })
      if (!offTrack) return null
      const gap = offTrack.target - offTrack.current
      return {
        triggerKey: 'goal_off_track',
        priority: 2,
        partnerId: 'nutmeg',
        headline: `"${offTrack.name}" goal is falling behind`,
        body: `You're £${gap.toLocaleString()} short of your goal. Investing the shortfall could close the gap — a managed ISA means the money works while you sleep.`,
        cta: 'Invest to hit my goal',
        url: 'https://www.nutmeg.com/?utm_source=vaultly&utm_campaign=goal_offtrack',
        category: 'investment',
        riskWarning: 'Your capital is at risk. Investments can fall as well as rise.',
        estimatedCommission: 120,
        triggerData: { goalName: offTrack.name, gap },
      }
    },
  },

  // ── High net worth, no managed portfolio ──
  {
    key: 'high_nw_no_invest',
    partnerId: 'hl',
    priority: 2,
    evaluate: (s) => {
      if (s.netWorth < 100000 || s.hasInvestments) return null
      return {
        triggerKey: 'high_nw_no_invest',
        priority: 2,
        partnerId: 'hl',
        headline: `£${(s.netWorth / 1000).toFixed(0)}k net worth — is it all working hard enough?`,
        body: 'With significant wealth, a diversified investment portfolio ensures your money isn\'t just sitting in property and cash. HL offers expert fund management alongside DIY.',
        cta: 'Explore HL investment options',
        url: 'https://www.hl.co.uk/?utm_source=vaultly&utm_campaign=high_nw',
        category: 'investment',
        riskWarning: 'Investments can fall as well as rise. You may get back less than you invest.',
        estimatedCommission: 150,
        triggerData: { netWorth: s.netWorth },
      }
    },
  },
]

// ── Build snapshot from DB ────────────────────────────────────────────────────

export async function buildSnapshot(userId: string, householdId: string): Promise<UserFinancialSnapshot> {
  const [assetsRes, liabRes, renewalsRes, goalsRes, scoreRes, userRes] = await Promise.all([
    db.execute({ sql: 'SELECT category, value FROM assets WHERE household_id = ?', args: [householdId] }),
    db.execute({ sql: 'SELECT category, balance, notes FROM liabilities WHERE household_id = ?', args: [householdId] }),
    db.execute({ sql: 'SELECT category, amount, renewal_date, notes FROM renewals WHERE household_id = ?', args: [householdId] }),
    db.execute({ sql: 'SELECT name, target_amount, current_amount, target_date FROM goals WHERE household_id = ?', args: [householdId] }),
    db.execute({ sql: 'SELECT score FROM vault_scores WHERE user_id = ? ORDER BY created_at DESC LIMIT 1', args: [userId] }),
    db.execute({ sql: 'SELECT currency FROM users WHERE id = ?', args: [userId] }),
  ])

  const assets = assetsRes.rows
  const liabilities = liabRes.rows
  const renewals = renewalsRes.rows

  const totalAssets = assets.reduce((s, a) => s + Number(a.value), 0)
  const totalLiabilities = liabilities.reduce((s, l) => s + Number(l.balance), 0)
  const liquidCash = assets.filter(a => a.category === 'bank_account').reduce((s, a) => s + Number(a.value), 0)

  const monthlyExpenses = Math.max(
    liabilities.reduce((s, l) => s + Number(l.balance) * 0.01, 0) +
    renewals.reduce((s, r) => s + Number(r.amount) / 12, 0),
    500
  )

  const INVEST_CATS = new Set(['investment', 'isa_ss', 'isa_lifetime', 'etf', 'bonds', 'pea', 'assurance_vie'])

  const now = Date.now()
  const mortgageLiab = liabilities.find(l => l.category === 'mortgage')
  const mortgageRenewal = renewals.find(r =>
    String(r.notes || '').toLowerCase().includes('mortgage') ||
    String(r.category || '') === 'mortgage'
  )

  const insuranceRenewals = renewals.filter(r =>
    String(r.category || '').includes('insurance') ||
    String(r.notes || '').toLowerCase().includes('insurance')
  )

  const nearestInsurance = insuranceRenewals
    .map(r => (new Date(r.renewal_date as string).getTime() - now) / 86400000)
    .filter(d => d > 0 && d <= 60)
    .sort((a, b) => a - b)[0] ?? null

  const mortgageDays = mortgageRenewal
    ? Math.max(0, Math.round((new Date(mortgageRenewal.renewal_date as string).getTime() - now) / 86400000))
    : null

  return {
    userId,
    householdId,
    totalAssets,
    totalLiabilities,
    netWorth: totalAssets - totalLiabilities,
    liquidCash,
    monthlyExpenses,
    emergencyBufferMonths: monthlyExpenses > 0 ? liquidCash / monthlyExpenses : 0,
    hasPension: assets.some(a => ['pension', 'sipp', 'riester'].includes(a.category as string)),
    hasInvestments: assets.some(a => INVEST_CATS.has(a.category as string)),
    hasProperty: assets.some(a => a.category === 'property'),
    hasIdleCash: liquidCash > monthlyExpenses * 6,
    mortgageRenewalDays: mortgageDays,
    insuranceRenewalDays: nearestInsurance !== null ? Math.round(nearestInsurance) : null,
    goals: goalsRes.rows.map(g => ({
      name: g.name as string,
      target: Number(g.target_amount),
      current: Number(g.current_amount),
      targetDate: g.target_date as string | null,
    })),
    vaultScore: scoreRes.rows[0] ? Number(scoreRes.rows[0].score) : 0,
    currency: (userRes.rows[0]?.currency as string) || 'GBP',
  }
}

// ── Evaluate rules and return ranked nudges ───────────────────────────────────

export async function getEligibleNudges(
  userId: string,
  householdId: string,
  limit = 3
): Promise<ReferralNudge[]> {
  const snapshot = await buildSnapshot(userId, householdId)

  // Check which nudges have been shown/dismissed recently (don't spam)
  const recentRes = await db.execute({
    sql: `SELECT trigger_key FROM referral_nudges
          WHERE user_id = ? AND (shown_at > datetime('now', '-30 days') OR dismissed_at IS NOT NULL)`,
    args: [userId],
  })
  const recentKeys = new Set(recentRes.rows.map(r => r.trigger_key as string))

  const nudges: ReferralNudge[] = []

  for (const rule of RULES) {
    if (recentKeys.has(rule.key)) continue  // don't show again within 30 days
    const nudge = rule.evaluate(snapshot)
    if (nudge) nudges.push(nudge)
  }

  // Sort by priority then estimated commission
  nudges.sort((a, b) => a.priority - b.priority || b.estimatedCommission - a.estimatedCommission)

  return nudges.slice(0, limit)
}

// ── Log nudge interaction ─────────────────────────────────────────────────────

export async function logNudgeShown(userId: string, triggerKey: string, partnerId: string, triggerData: Record<string, unknown>) {
  const { randomUUID } = await import('crypto')
  await db.execute({
    sql: `INSERT INTO referral_nudges (id, user_id, partner_id, trigger_key, trigger_data, shown_at)
          VALUES (?, ?, ?, ?, ?, datetime('now'))
          ON CONFLICT DO NOTHING`,
    args: [randomUUID(), userId, partnerId, triggerKey, JSON.stringify(triggerData)],
  })
}

export async function logNudgeClick(userId: string, triggerKey: string) {
  await db.execute({
    sql: `UPDATE referral_nudges SET clicked_at = datetime('now')
          WHERE user_id = ? AND trigger_key = ? AND clicked_at IS NULL
          ORDER BY created_at DESC LIMIT 1`,
    args: [userId, triggerKey],
  })
}

export async function logNudgeDismiss(userId: string, triggerKey: string) {
  await db.execute({
    sql: `UPDATE referral_nudges SET dismissed_at = datetime('now')
          WHERE user_id = ? AND trigger_key = ? AND dismissed_at IS NULL
          ORDER BY created_at DESC LIMIT 1`,
    args: [userId, triggerKey],
  })
}
