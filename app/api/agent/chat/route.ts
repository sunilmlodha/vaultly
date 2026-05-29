import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { streamAgentResponse, extractProbableAssets } from '@/lib/claude/agent'
import type { AgentMessage } from '@/lib/types'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { messages, workflowId } = await req.json() as { messages: AgentMessage[]; workflowId?: string }

  // Create readable stream for SSE
  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      let fullText = ''

      try {
        fullText = await streamAgentResponse(messages, (chunk) => {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'chunk', text: chunk })}\n\n`))
        })

        // Check if agent produced probable assets
        const probableAssets = extractProbableAssets(fullText)

        // Persist to database
        const assistantMessage: AgentMessage = {
          role: 'assistant',
          content: fullText,
          timestamp: new Date().toISOString(),
        }

        const updatedMessages = [...messages, assistantMessage]
        const newPhase = probableAssets ? 'approval' : 'intake'

        if (workflowId) {
          await supabase.from('agent_workflows').update({
            messages: updatedMessages,
            phase: newPhase,
            probable_assets: probableAssets || [],
            updated_at: new Date().toISOString(),
          }).eq('id', workflowId).eq('user_id', user.id)
        } else {
          const { data } = await supabase.from('agent_workflows').insert({
            user_id: user.id,
            messages: updatedMessages,
            phase: newPhase,
            probable_assets: probableAssets || [],
          }).select('id').single()

          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'workflow_id', id: data?.id })}\n\n`))
        }

        // Audit log
        await supabase.from('audit_log').insert({
          user_id: user.id,
          event_type: 'agent_message_sent',
          entity_type: 'agent_workflow',
          entity_id: workflowId || null,
          outcome: probableAssets ? 'inference_complete' : 'intake_ongoing',
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
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  })
}

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data } = await supabase
    .from('agent_workflows')
    .select('*')
    .eq('user_id', user.id)
    .order('updated_at', { ascending: false })
    .limit(1)
    .single()

  return NextResponse.json({ workflow: data || null })
}
