import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { streamAgentResponse, extractProbableAssets } from '@/lib/claude/agent'
import { randomUUID } from 'crypto'
import type { AgentMessage } from '@/lib/types'

export const maxDuration = 60 // Allow up to 60s for Claude streaming

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { messages, workflowId } = await req.json() as { messages: AgentMessage[]; workflowId?: string }
  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      let fullText = ''
      try {
        fullText = await streamAgentResponse(messages, (chunk) => {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'chunk', text: chunk })}\n\n`))
        })

        const probableAssets = extractProbableAssets(fullText)
        const assistantMsg: AgentMessage = { role: 'assistant', content: fullText, timestamp: new Date().toISOString() }
        const updatedMessages = [...messages, assistantMsg]
        const newPhase = probableAssets ? 'approval' : 'intake'
        const now = new Date().toISOString()

        if (workflowId) {
          await db.execute({
            sql: 'UPDATE agent_workflows SET messages=?, phase=?, probable_assets=?, updated_at=? WHERE id=? AND user_id=?',
            args: [JSON.stringify(updatedMessages), newPhase, JSON.stringify(probableAssets || []), now, workflowId, session.user.id],
          })
        } else {
          const newId = randomUUID()
          await db.execute({
            sql: 'INSERT INTO agent_workflows (id, user_id, messages, phase, probable_assets, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
            args: [newId, session.user.id, JSON.stringify(updatedMessages), newPhase, JSON.stringify(probableAssets || []), now, now],
          })
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'workflow_id', id: newId })}\n\n`))
        }

        // Audit log
        await db.execute({
          sql: 'INSERT INTO audit_log (id, user_id, event_type, entity_type, outcome, created_at) VALUES (?, ?, ?, ?, ?, ?)',
          args: [randomUUID(), session.user.id, 'agent_message', 'agent_workflow', probableAssets ? 'inference_complete' : 'intake_ongoing', now],
        })

        if (probableAssets) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'probable_assets', assets: probableAssets })}\n\n`))
        }
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'done' })}\n\n`))
      } catch (err) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'error', message: String(err) })}\n\n`))
      } finally {
        controller.close()
      }
    },
  })

  return new NextResponse(stream, {
    headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', 'Connection': 'keep-alive' },
  })
}

export async function GET() {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const result = await db.execute({
    sql: 'SELECT * FROM agent_workflows WHERE user_id = ? ORDER BY updated_at DESC LIMIT 1',
    args: [session.user.id],
  })

  if (result.rows.length === 0) return NextResponse.json({ workflow: null })

  const row = result.rows[0]
  return NextResponse.json({
    workflow: {
      ...row,
      messages: JSON.parse(row.messages as string),
      probable_assets: JSON.parse(row.probable_assets as string),
    },
  })
}
