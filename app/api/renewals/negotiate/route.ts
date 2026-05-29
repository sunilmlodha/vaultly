import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { streamRenewalAgentResponse, extractNegotiationOutput } from '@/lib/claude/renewal-agent'
import { randomUUID } from 'crypto'
import type { AgentMessage, Renewal } from '@/lib/types'

export const maxDuration = 60

// POST — stream a negotiation chat turn
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { messages, renewalId, negotiationId } = await req.json() as {
    messages: AgentMessage[]
    renewalId: string
    negotiationId?: string
  }

  // Load the renewal for context
  const renewalResult = await db.execute({
    sql: 'SELECT * FROM renewals WHERE id = ? AND household_id = ?',
    args: [renewalId, session.user.householdId],
  })
  if (renewalResult.rows.length === 0) {
    return NextResponse.json({ error: 'Renewal not found' }, { status: 404 })
  }
  const raw = renewalResult.rows[0]
  const renewal: Renewal = {
    id: raw.id as string,
    user_id: raw.user_id as string,
    household_id: raw.household_id as string,
    name: raw.name as string,
    category: raw.category as string,
    amount: Number(raw.amount),
    currency: raw.currency as string,
    renewal_date: raw.renewal_date as string,
    provider: raw.provider as string | undefined,
    auto_renews: Boolean(raw.auto_renews),
    notes: raw.notes as string | undefined,
    created_at: raw.created_at as string,
  }

  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      let fullText = ''
      try {
        fullText = await streamRenewalAgentResponse(messages, renewal, (chunk) => {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'chunk', text: chunk })}\n\n`))
        })

        const output = extractNegotiationOutput(fullText)
        const assistantMsg: AgentMessage = {
          role: 'assistant',
          content: fullText,
          timestamp: new Date().toISOString(),
        }
        const updatedMessages = [...messages, assistantMsg]
        const now = new Date().toISOString()

        if (negotiationId) {
          await db.execute({
            sql: 'UPDATE renewal_negotiations SET messages=?, draft_letter=?, updated_at=? WHERE id=? AND user_id=?',
            args: [
              JSON.stringify(updatedMessages),
              output?.draft_letter ?? null,
              now,
              negotiationId,
              session.user.id,
            ],
          })
        } else {
          const newId = randomUUID()
          await db.execute({
            sql: `INSERT INTO renewal_negotiations
                    (id, renewal_id, user_id, household_id, messages, draft_letter, created_at, updated_at)
                  VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            args: [
              newId,
              renewalId,
              session.user.id,
              session.user.householdId,
              JSON.stringify(updatedMessages),
              output?.draft_letter ?? null,
              now,
              now,
            ],
          })
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ type: 'negotiation_id', id: newId })}\n\n`)
          )
        }

        if (output) {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ type: 'output', output })}\n\n`)
          )
          // Stamp the renewal with negotiation status
          if (output.recommendation) {
            await db.execute({
              sql: 'UPDATE renewals SET negotiation_status=? WHERE id=? AND household_id=?',
              args: [output.recommendation, renewalId, session.user.householdId],
            })
          }
        }

        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'done' })}\n\n`))
      } catch (err) {
        const msg = String(err)
        const friendly =
          msg.includes('credit balance') || msg.includes('billing')
            ? 'The AI service is temporarily unavailable. Please try again later.'
            : 'Something went wrong. Please try again.'
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ type: 'error', message: friendly })}\n\n`)
        )
      } finally {
        controller.close()
      }
    },
  })

  return new NextResponse(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  })
}

// GET — load existing negotiation for a renewal
export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const renewalId = searchParams.get('renewalId')
  if (!renewalId) return NextResponse.json({ negotiation: null })

  const result = await db.execute({
    sql: `SELECT * FROM renewal_negotiations
          WHERE renewal_id = ? AND user_id = ?
          ORDER BY updated_at DESC LIMIT 1`,
    args: [renewalId, session.user.id],
  })

  if (result.rows.length === 0) return NextResponse.json({ negotiation: null })

  const row = result.rows[0]
  return NextResponse.json({
    negotiation: {
      ...row,
      messages: JSON.parse(row.messages as string),
    },
  })
}
