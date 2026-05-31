// Benefits optimiser — calculates what an employee is leaving on the table

export interface BenefitOpportunity {
  id: string
  type: 'pension_match' | 'salary_sacrifice' | 'share_scheme' | 'isa' | 'cycle_to_work'
  title: string
  description: string
  annualSavingGBP: number      // estimated annual saving/gain
  urgency: 'high' | 'medium' | 'low'
  actionLabel: string
  actionUrl?: string
  deadline?: string
}

export interface OrgBenefitsConfig {
  pensionMatchPct: number | null        // employer matches up to X% of salary
  pensionMaxMatchPct: number | null     // employer contributes max X% of salary
  salarySacrificeEnabled: boolean
  shareScheme: { name: string; deadline: string | null } | null
}

// UK tax rates 2024-25
const BASIC_RATE = 0.20
const NIC_EMPLOYEE = 0.12
const NIC_EMPLOYER = 0.138

export function calculateBenefits(params: {
  annualSalary: number
  currentPensionPct: number
  config: OrgBenefitsConfig
}): BenefitOpportunity[] {
  const { annualSalary, currentPensionPct, config } = params
  const opportunities: BenefitOpportunity[] = []

  // ── 1. Pension match gap ──────────────────────────────────────────────────
  if (config.pensionMatchPct && config.pensionMaxMatchPct) {
    const matchCap = config.pensionMatchPct
    const employerContributes = config.pensionMaxMatchPct

    if (currentPensionPct < matchCap) {
      const gapPct = matchCap - currentPensionPct
      const freeMoney = (annualSalary * gapPct) / 100
      const taxRelief = freeMoney * BASIC_RATE

      opportunities.push({
        id: 'pension_match',
        type: 'pension_match',
        title: 'Free money from your employer',
        description: `Your employer matches up to ${matchCap}% of your salary but you only contribute ${currentPensionPct}%. Increase by ${gapPct.toFixed(1)}% and your employer adds £${Math.round(freeMoney).toLocaleString()}/year — plus you get ${Math.round(BASIC_RATE * 100)}% tax relief on top.`,
        annualSavingGBP: Math.round(freeMoney + taxRelief),
        urgency: freeMoney > 1000 ? 'high' : 'medium',
        actionLabel: 'Increase pension contribution',
      })
    }
  }

  // ── 2. Salary sacrifice — pension (if not already doing it) ──────────────
  if (config.salarySacrificeEnabled && currentPensionPct < 5) {
    const extraPct = 5 - currentPensionPct
    const extraContrib = (annualSalary * extraPct) / 100
    // Salary sacrifice saves employer NIC too — some pass this on
    const taxAndNicSaving = extraContrib * (BASIC_RATE + NIC_EMPLOYEE)

    opportunities.push({
      id: 'salary_sacrifice_pension',
      type: 'salary_sacrifice',
      title: 'Salary sacrifice — keep more of your money',
      description: `Contributing ${extraPct}% more via salary sacrifice saves you £${Math.round(taxAndNicSaving).toLocaleString()}/year in tax and National Insurance — your take-home barely changes but your pension grows faster.`,
      annualSavingGBP: Math.round(taxAndNicSaving),
      urgency: 'medium',
      actionLabel: 'Switch to salary sacrifice',
    })
  }

  // ── 3. Cycle to work scheme ────────────────────────────────────────────────
  if (config.salarySacrificeEnabled) {
    const bikeCost = 1200 // typical bike
    const saving = bikeCost * (BASIC_RATE + NIC_EMPLOYEE)
    opportunities.push({
      id: 'cycle_to_work',
      type: 'cycle_to_work',
      title: 'Cycle to Work scheme',
      description: `Get a £1,200 bike and save ~£${Math.round(saving).toLocaleString()} through salary sacrifice. Spread over 12 months, net cost ~£${Math.round((bikeCost - saving) / 12)}/month.`,
      annualSavingGBP: Math.round(saving),
      urgency: 'low',
      actionLabel: 'Apply for Cycle to Work',
    })
  }

  // ── 4. Share scheme ────────────────────────────────────────────────────────
  if (config.shareScheme) {
    const { name, deadline } = config.shareScheme
    const deadlineDays = deadline
      ? Math.max(0, Math.round((new Date(deadline).getTime() - Date.now()) / 86400000))
      : null

    opportunities.push({
      id: 'share_scheme',
      type: 'share_scheme',
      title: `${name} — discounted company shares`,
      description: deadline && deadlineDays !== null
        ? `Enrollment closes in ${deadlineDays} days. Sharesave schemes typically offer a 20% discount on market price — that's instant return before any growth.`
        : `${name} typically offers discounted shares — make sure you\'re enrolled.`,
      annualSavingGBP: Math.round(annualSalary * 0.02), // rough estimate
      urgency: deadlineDays !== null && deadlineDays < 14 ? 'high' : 'medium',
      actionLabel: 'Enroll now',
      deadline: deadline ?? undefined,
    })
  }

  // ── 5. ISA allowance reminder ─────────────────────────────────────────────
  const now = new Date()
  const taxYearEnd = new Date(now.getFullYear(), 3, 5) // April 5
  if (taxYearEnd.getTime() - now.getTime() < 90 * 86400000) {
    opportunities.push({
      id: 'isa_allowance',
      type: 'isa',
      title: 'ISA allowance — use it or lose it',
      description: 'UK ISA allowance is £20,000/year. It resets April 6 — any unused allowance is gone forever. Even putting £1,000 in a cash ISA this week saves up to £200 in future tax.',
      annualSavingGBP: Math.round(Math.min(annualSalary * 0.05, 20000) * BASIC_RATE),
      urgency: 'high',
      actionLabel: 'Open or top up ISA',
    })
  }

  return opportunities.sort((a, b) => {
    const urgencyOrder = { high: 0, medium: 1, low: 2 }
    return urgencyOrder[a.urgency] - urgencyOrder[b.urgency] || b.annualSavingGBP - a.annualSavingGBP
  })
}

export const SALARY_RANGES = [
  { label: 'Under £20,000', value: 17500 },
  { label: '£20,000 – £30,000', value: 25000 },
  { label: '£30,000 – £40,000', value: 35000 },
  { label: '£40,000 – £55,000', value: 47500 },
  { label: '£55,000 – £75,000', value: 65000 },
  { label: '£75,000+', value: 90000 },
]
