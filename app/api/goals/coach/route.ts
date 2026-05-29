import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic()

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const goalId = searchParams.get('goalId')
  if (!goalId) return NextResponse.json({ error: 'goalId required' }, { status: 400 })

  const hid = session.user.householdId

  // Load goal
  const goalRes = await db.execute({
    sql: `SELECT * FROM goals WHERE id = ? AND household_id = ?`,
    args: [goalId, hid],
  })

  if (goalRes.rows.length === 0) {
    return NextResponse.json({ error: 'Goal not found' }, { status: 404 })
  }

  type GoalRow = {
    id: string; name: string; category: string; target_amount: number
    current_amount: number; currency: string; target_date: string | null
  }
  const goal = goalRes.rows[0] as unknown as GoalRow

  // Last 3 months income + expenses
  const cutoff = new Date()
  cutoff.setMonth(cutoff.getMonth() - 3)
  const cutoffStr = cutoff.toISOString().slice(0, 10)

  const txRes = await db.execute({
    sql: `SELECT amount, category FROM ob_transactions WHERE household_id = ? AND date >= ? AND amount != 0`,
    args: [hid, cutoffStr],
  })

  type TxRow = { amount: number; category: string | null }
  const txs = txRes.rows as unknown as TxRow[]

  const monthlyIncome = txs.filter(t => t.category === 'income' && Number(t.amount) > 0)
    .reduce((s, t) => s + Number(t.amount), 0) / 3
  const monthlyExpenses = txs.filter(t => t.category !== 'income' && t.category !== 'financial' && Number(t.amount) < 0)
    .reduce((s, t) => s + Math.abs(Number(t.amount)), 0) / 3
  const monthlySurplus = monthlyIncome - monthlyExpenses

  // Progress calculation
  const remaining = Number(goal.target_amount) - Number(goal.current_amount)
  const pct = Math.round((Number(goal.current_amount) / Number(goal.target_amount)) * 100)
  const monthsToTarget = goal.target_date
    ? Math.max(0, Math.round((new Date(goal.target_date).getTime() - Date.now()) / (30 * 24 * 60 * 60 * 1000)))
    : null
  const requiredMonthly = monthsToTarget && monthsToTarget > 0 ? remaining / monthsToTarget : null
  const onTrack = requiredMonthly !== null && monthlySurplus > 0 && (monthlySurplus * 0.3) >= requiredMonthly

  const prompt = `You are a friendly UK financial coach. Provide a brief, encouraging coaching tip for a household financial goal.

Goal: "${goal.name}" (${goal.category})
Progress: ${pct}% complete (£${Number(goal.current_amount).toLocaleString()} of £${Number(goal.target_amount).toLocaleString()})
Target date: ${goal.target_date || 'not set'}
Months remaining: ${monthsToTarget ?? 'unknown'}
Required monthly savings to hit goal: £${requiredMonthly ? requiredMonthly.toFixed(0) : 'unknown'}
Current monthly surplus (income - expenses): £${monthlySurplus.toFixed(0)}
On track: ${onTrack ? 'yes' : 'no'}

Write 2-3 sentences of personalised coaching. Be specific, encouraging, and practical.
If they're on track, celebrate and suggest a stretch goal.
If behind, give one specific actionable suggestion to get back on track.
End with one concrete number (e.g. "saving £X/month would get you there by Y").`

  let tip = `You're ${pct}% of the way to your ${goal.name} goal. ${onTrack ? 'You\'re on track — keep it up!' : `You need to save around £${requiredMonthly?.toFixed(0) ?? '?'}/month to hit your target.`}`

  try {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 200,
      messages: [{ role: 'user', content: prompt }],
    })
    const text = response.content[0].type === 'text' ? response.content[0].text : ''
    if (text) tip = text.trim()
  } catch {
    // Use computed fallback
  }

  return NextResponse.json({
    tip,
    on_track: onTrack,
    progress_pct: pct,
    required_monthly: requiredMonthly,
    monthly_surplus: Math.round(monthlySurplus * 100) / 100,
    months_remaining: monthsToTarget,
  })
}
