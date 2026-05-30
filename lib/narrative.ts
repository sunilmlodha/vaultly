import Anthropic from '@anthropic-ai/sdk'
import { db } from './db'
import { randomUUID } from 'crypto'
import { formatCurrency } from './utils'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export interface NarrativeResult {
  id: string
  month: string
  headline: string
  content: string
  score_at_time: number | null
  created_at: string
  isNew: boolean
}

function currentMonth(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

function monthLabel(month: string): string {
  const [y, m] = month.split('-')
  return new Date(Number(y), Number(m) - 1, 1)
    .toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })
}

export async function getOrGenerateNarrative(
  userId: string,
  householdId: string,
  userName: string,
  currency: string = 'GBP',
  vaultScore?: number
): Promise<NarrativeResult> {
  const month = currentMonth()

  // Return existing narrative for this month if already generated
  const existing = await db.execute({
    sql: 'SELECT * FROM wealth_narratives WHERE user_id = ? AND month = ?',
    args: [userId, month],
  })
  if (existing.rows.length > 0) {
    const r = existing.rows[0]
    return {
      id: r.id as string,
      month: r.month as string,
      headline: r.headline as string,
      content: r.content as string,
      score_at_time: r.score_at_time as number | null,
      created_at: r.created_at as string,
      isNew: false,
    }
  }

  // Gather financial data for the prompt
  const [assetsRes, liabsRes, goalsRes, renewalsRes, prevScoreRes] = await Promise.all([
    db.execute({
      sql: 'SELECT name, category, value FROM assets WHERE household_id = ? ORDER BY value DESC LIMIT 5',
      args: [householdId],
    }),
    db.execute({
      sql: 'SELECT name, category, balance FROM liabilities WHERE household_id = ? ORDER BY balance DESC LIMIT 5',
      args: [householdId],
    }),
    db.execute({
      sql: 'SELECT name, target_amount, current_amount FROM goals WHERE household_id = ? ORDER BY current_amount/target_amount DESC',
      args: [householdId],
    }),
    db.execute({
      sql: `SELECT name, amount, renewal_date FROM renewals
            WHERE household_id = ? AND renewal_date >= date('now') ORDER BY renewal_date LIMIT 3`,
      args: [householdId],
    }),
    db.execute({
      sql: 'SELECT score FROM vault_scores WHERE user_id = ? ORDER BY created_at DESC LIMIT 2',
      args: [userId],
    }),
  ])

  const totalAssets = assetsRes.rows.reduce((s, a) => s + Number(a.value), 0)
  const totalLiabs  = liabsRes.rows.reduce((s, l)  => s + Number(l.balance), 0)
  const netWorth    = totalAssets - totalLiabs
  const prevScore   = prevScoreRes.rows.length > 1 ? Number(prevScoreRes.rows[1].score) : null
  const currentScore = vaultScore ?? (prevScoreRes.rows[0] ? Number(prevScoreRes.rows[0].score) : null)
  const scoreTrend  = currentScore !== null && prevScore !== null ? currentScore - prevScore : null

  const topAssets = assetsRes.rows
    .map(a => `${a.name} (${a.category}): ${formatCurrency(Number(a.value), currency)}`)
    .join(', ')

  const topLiabs = liabsRes.rows
    .map(l => `${l.name}: ${formatCurrency(Number(l.balance), currency)}`)
    .join(', ')

  const goalsText = goalsRes.rows
    .map(g => {
      const pct = Number(g.target_amount) > 0
        ? Math.round((Number(g.current_amount) / Number(g.target_amount)) * 100)
        : 0
      return `${g.name} (${pct}% complete)`
    })
    .join(', ')

  const renewalsText = renewalsRes.rows
    .map(r => `${r.name} due ${r.renewal_date} (${formatCurrency(Number(r.amount), currency)})`)
    .join(', ')

  const prompt = `You are Vaultly's financial storyteller. Write a personalised monthly wealth narrative for ${userName} for ${monthLabel(month)}.

THEIR FINANCIAL DATA:
- Net worth: ${formatCurrency(netWorth, currency)}
- Top assets: ${topAssets || 'None added yet'}
- Liabilities: ${topLiabs || 'None'}
- Goals: ${goalsText || 'No goals set yet'}
- Upcoming renewals: ${renewalsText || 'None upcoming'}
${currentScore !== null ? `- Vault Score: ${currentScore}/850${scoreTrend !== null ? ` (${scoreTrend >= 0 ? '+' : ''}${scoreTrend} this month)` : ''}` : ''}

Write TWO things:
1. HEADLINE: A single punchy sentence (max 12 words) capturing this month's financial story. Start with an emoji.
2. NARRATIVE: A 120-150 word story in second person ("you", "your") with warmth and personality. Be specific about THEIR actual numbers. Celebrate wins, acknowledge challenges honestly, end with one forward-looking insight. Use vivid but professional language — like a wise financial advisor who tells good stories. No bullet points, no headings, just flowing prose.

Format your response EXACTLY like this:
HEADLINE: [your headline here]
NARRATIVE: [your narrative here]`

  const message = await client.messages.create({
    model: 'claude-opus-4-5',
    max_tokens: 400,
    messages: [{ role: 'user', content: prompt }],
  })

  const raw = (message.content[0] as { type: string; text: string }).text
  const headlineMatch = raw.match(/HEADLINE:\s*(.+)/i)
  const narrativeMatch = raw.match(/NARRATIVE:\s*([\s\S]+)/i)

  const headline = headlineMatch?.[1]?.trim() ?? `Your ${monthLabel(month)} financial story`
  const content  = narrativeMatch?.[1]?.trim() ?? raw.trim()

  // Store narrative
  const id = randomUUID()
  await db.execute({
    sql: `INSERT INTO wealth_narratives (id, user_id, month, headline, content, score_at_time)
          VALUES (?, ?, ?, ?, ?, ?)`,
    args: [id, userId, month, headline, content, currentScore ?? null],
  })

  // Create in-app notification for new narrative
  await db.execute({
    sql: `INSERT INTO notifications (id, user_id, type, title, body, action_url)
          VALUES (?, ?, 'narrative', ?, ?, '/dashboard')`,
    args: [
      randomUUID(), userId,
      `Your ${monthLabel(month)} wealth story is ready`,
      headline,
    ],
  })

  return { id, month, headline, content, score_at_time: currentScore ?? null, created_at: new Date().toISOString(), isNew: true }
}

export async function getPastNarratives(userId: string, limit = 6) {
  const res = await db.execute({
    sql: `SELECT id, month, headline, content, score_at_time, created_at
          FROM wealth_narratives WHERE user_id = ?
          ORDER BY month DESC LIMIT ?`,
    args: [userId, limit],
  })
  return res.rows
}
