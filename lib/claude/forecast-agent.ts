import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic()

export interface ForecastMonth {
  month: string       // YYYY-MM
  label: string       // "Jun '25"
  projected_income: number
  projected_expenses: number
  projected_net: number
  renewals_due: number
  is_risk_month: boolean
  risk_reason?: string
}

export interface ForecastResult {
  months: ForecastMonth[]
  narrative: string
  total_renewals_cost: number
  avg_monthly_surplus: number
  risk_months_count: number
  top_tip: string
}

interface MonthlyData {
  month: string
  income: number
  expenses: number
}

interface Renewal {
  name: string
  amount: number
  renewal_date: string
  category: string
}

export async function generateCashflowForecast(
  historicalMonthly: MonthlyData[],
  upcomingRenewals: Renewal[],
  currency: string = 'GBP'
): Promise<ForecastResult> {
  // Calculate averages from last 3 months of actual data
  const recent = historicalMonthly.slice(-3)
  const avgIncome = recent.length > 0
    ? recent.reduce((s, m) => s + m.income, 0) / recent.length
    : 0
  const avgExpenses = recent.length > 0
    ? recent.reduce((s, m) => s + m.expenses, 0) / recent.length
    : 0

  // Build 6-month forward projection
  const today = new Date()
  const months: ForecastMonth[] = []

  for (let i = 1; i <= 6; i++) {
    const d = new Date(today.getFullYear(), today.getMonth() + i, 1)
    const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const label = d.toLocaleString('en-GB', { month: 'short', year: '2-digit' })

    // Renewals due this month
    const monthRenewals = upcomingRenewals.filter(r => r.renewal_date?.startsWith(ym))
    const renewalsCost = monthRenewals.reduce((s, r) => s + Number(r.amount), 0)

    const projected_income = Math.round(avgIncome * 100) / 100
    const projected_expenses = Math.round((avgExpenses + renewalsCost) * 100) / 100
    const projected_net = Math.round((projected_income - projected_expenses) * 100) / 100
    const is_risk_month = projected_net < 0 || renewalsCost > avgIncome * 0.15

    months.push({
      month: ym,
      label,
      projected_income,
      projected_expenses,
      projected_net,
      renewals_due: Math.round(renewalsCost * 100) / 100,
      is_risk_month,
      risk_reason: is_risk_month
        ? projected_net < 0
          ? 'Projected deficit'
          : `Renewals spike: ${monthRenewals.map(r => r.name).join(', ')}`
        : undefined,
    })
  }

  const total_renewals_cost = upcomingRenewals.reduce((s, r) => s + Number(r.amount), 0)
  const avg_monthly_surplus = Math.round(months.reduce((s, m) => s + m.projected_net, 0) / 6 * 100) / 100
  const risk_months_count = months.filter(m => m.is_risk_month).length

  // Generate narrative with Claude
  const prompt = `You are a friendly UK personal finance advisor. Based on this household's 6-month cashflow forecast, write a brief, helpful narrative (3-4 sentences max) and one top actionable tip.

Historical monthly averages: income £${Math.round(avgIncome)}/mo, expenses £${Math.round(avgExpenses)}/mo
Upcoming renewals in next 6 months: ${upcomingRenewals.map(r => `${r.name} (£${r.amount}, due ${r.renewal_date})`).join(', ') || 'none'}
Risk months: ${months.filter(m => m.is_risk_month).map(m => `${m.label} (${m.risk_reason})`).join(', ') || 'none'}
Projected 6-month avg surplus: £${avg_monthly_surplus}/mo

Respond in JSON: { "narrative": "...", "top_tip": "..." }
Keep narrative conversational and specific. top_tip should be one concrete action they can take.`

  let narrative = `Based on your recent spending patterns, you're projected to ${avg_monthly_surplus >= 0 ? `save around £${Math.abs(avg_monthly_surplus).toFixed(0)}/month` : `run a £${Math.abs(avg_monthly_surplus).toFixed(0)}/month deficit`} over the next 6 months.`
  let top_tip = 'Review your upcoming renewals and negotiate at least one before its renewal date.'

  try {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 300,
      messages: [{ role: 'user', content: prompt }],
    })

    const text = response.content[0].type === 'text' ? response.content[0].text : ''
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0])
      if (parsed.narrative) narrative = parsed.narrative
      if (parsed.top_tip) top_tip = parsed.top_tip
    }
  } catch {
    // Fallback to computed narrative above
  }

  return {
    months,
    narrative,
    total_renewals_cost: Math.round(total_renewals_cost * 100) / 100,
    avg_monthly_surplus,
    risk_months_count,
    top_tip,
  }
}
