import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { getOrGenerateNarrative, getPastNarratives } from '@/lib/narrative'
import { db } from '@/lib/db'

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const userId = session.user.id
  const householdId = (session.user as Record<string, unknown>).householdId as string

  if (!householdId) {
    return NextResponse.json({ error: 'No household found' }, { status: 400 })
  }

  // Get user info for personalised narrative
  const userRes = await db.execute({
    sql: 'SELECT full_name, currency FROM users WHERE id = ?',
    args: [userId],
  })
  const user = userRes.rows[0]

  // Get latest vault score for context
  const scoreRes = await db.execute({
    sql: 'SELECT score FROM vault_scores WHERE user_id = ? ORDER BY created_at DESC LIMIT 1',
    args: [userId],
  })
  const vaultScore = scoreRes.rows[0] ? Number(scoreRes.rows[0].score) : undefined

  const narrative = await getOrGenerateNarrative(
    userId,
    householdId,
    (user?.full_name as string) ?? 'there',
    (user?.currency as string) ?? 'GBP',
    vaultScore
  )

  const past = await getPastNarratives(userId, 5)

  return NextResponse.json({ narrative, past })
}
