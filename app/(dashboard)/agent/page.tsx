'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { Topbar } from '@/components/layout/topbar'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Send, Search, CheckCircle, AlertCircle, ExternalLink, RotateCcw, Bot, User } from 'lucide-react'
import type { AgentMessage, ProbableAsset, AgentWorkflow } from '@/lib/types'

const WELCOME = `Hello! I'm your Dormant Asset Recovery Agent.

I'll help you trace forgotten pensions, dormant bank accounts, and other lost financial assets — the average UK adult has worked 11 jobs and many leave pension pots behind.

Let's start with your employment history. **Where did you first work, and roughly when?**

(Don't worry about exact dates — approximate years are fine.)`

const TRACING_LINKS: Record<string, { label: string; url: string }> = {
  pension_tracer: { label: 'Pension Tracing Service', url: 'https://www.gov.uk/find-pension-contact-details' },
  bank_tracer: { label: 'My Lost Account', url: 'https://www.mylostaccount.org.uk' },
  ns_i: { label: 'NS&I Tracing', url: 'https://www.nsandi.com/about-ns-i/contact-us' },
  abi: { label: 'ABI Tracing Service', url: 'https://www.abi.org.uk/products-and-issues/topics-and-issues/trace-your-pension' },
}

const CONFIDENCE_BADGE: Record<string, 'success' | 'warning' | 'default'> = {
  high: 'success',
  medium: 'warning',
  low: 'default',
}

function getConfidenceLabel(score: number): 'high' | 'medium' | 'low' {
  return score >= 0.7 ? 'high' : score >= 0.4 ? 'medium' : 'low'
}

function MessageBubble({ msg }: { msg: AgentMessage }) {
  const isUser = msg.role === 'user'
  // Strip JSON blocks from display
  const display = msg.content.replace(/```json[\s\S]*?```/g, '').trim()

  return (
    <div className={`flex gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
      <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${isUser ? 'bg-indigo-100' : 'bg-slate-100'}`}>
        {isUser ? <User size={14} className="text-indigo-600" /> : <Bot size={14} className="text-slate-600" />}
      </div>
      <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
        isUser ? 'bg-indigo-500 text-white rounded-tr-sm' : 'bg-white border border-slate-100 text-slate-700 rounded-tl-sm shadow-sm'
      }`}>
        {display}
      </div>
    </div>
  )
}

function ProbableAssetCard({ asset }: { asset: ProbableAsset }) {
  const level = getConfidenceLabel(asset.confidence_score)
  const link = TRACING_LINKS[asset.recommended_service]
  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm">
      <div className="flex items-start justify-between mb-2">
        <div>
          <p className="font-semibold text-slate-800">{asset.employer_name}</p>
          {asset.likely_provider && <p className="text-xs text-slate-500 mt-0.5">Likely: {asset.likely_provider}</p>}
        </div>
        <Badge variant={CONFIDENCE_BADGE[level]}>{level} confidence</Badge>
      </div>
      <p className="text-xs text-slate-500 mb-3">{asset.reasoning}</p>
      <div className="flex items-center justify-between">
        <Badge variant="info">{asset.asset_type.replace('_', ' ')}</Badge>
        {link && (
          <a href={link.url} target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs text-indigo-500 hover:text-indigo-600 font-medium">
            {link.label} <ExternalLink size={11} />
          </a>
        )}
      </div>
    </div>
  )
}

export default function AgentPage() {
  const [messages, setMessages] = useState<AgentMessage[]>([
    { role: 'assistant', content: WELCOME, timestamp: new Date().toISOString() },
  ])
  const [input, setInput] = useState('')
  const [streaming, setStreaming] = useState(false)
  const [workflowId, setWorkflowId] = useState<string | null>(null)
  const [probableAssets, setProbableAssets] = useState<ProbableAsset[]>([])
  const [phase, setPhase] = useState<'intake' | 'inference' | 'complete'>('intake')
  const { data: session } = useSession()
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    const load = async () => {
      // Load existing workflow
      const res = await fetch('/api/agent/chat')
      const { workflow } = await res.json() as { workflow: AgentWorkflow | null }
      if (workflow && workflow.messages.length > 0) {
        setMessages(workflow.messages)
        setWorkflowId(workflow.id)
        setProbableAssets(workflow.probable_assets || [])
        if ((workflow.probable_assets || []).length > 0) setPhase('complete')
      }
    }
    load()
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, streaming])

  const send = useCallback(async () => {
    if (!input.trim() || streaming) return
    const userMsg: AgentMessage = { role: 'user', content: input.trim(), timestamp: new Date().toISOString() }
    const updatedMessages = [...messages, userMsg]
    setMessages(updatedMessages)
    setInput('')
    setStreaming(true)

    const placeholder: AgentMessage = { role: 'assistant', content: '', timestamp: new Date().toISOString() }
    setMessages([...updatedMessages, placeholder])

    try {
      const res = await fetch('/api/agent/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: updatedMessages, workflowId }),
      })

      const reader = res.body!.getReader()
      const decoder = new TextDecoder()
      let accText = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const raw = decoder.decode(value)
        const lines = raw.split('\n').filter(l => l.startsWith('data: '))
        for (const line of lines) {
          const data = JSON.parse(line.slice(6))
          if (data.type === 'chunk') {
            accText += data.text
            setMessages(prev => {
              const copy = [...prev]
              copy[copy.length - 1] = { ...copy[copy.length - 1], content: accText }
              return copy
            })
          } else if (data.type === 'workflow_id') {
            setWorkflowId(data.id)
          } else if (data.type === 'probable_assets') {
            setProbableAssets(data.assets)
            setPhase('complete')
          } else if (data.type === 'error') {
            const msg = data.message?.includes('credit balance') || data.message?.includes('billing')
              ? 'The AI service is temporarily unavailable (billing issue). Please contact support or try again later.'
              : 'Sorry, something went wrong. Please try again.'
            setMessages(prev => {
              const copy = [...prev]
              copy[copy.length - 1] = { ...copy[copy.length - 1], content: msg }
              return copy
            })
          }
        }
      }
    } catch (err) {
      setMessages(prev => {
        const copy = [...prev]
        copy[copy.length - 1] = { ...copy[copy.length - 1], content: 'Sorry, something went wrong. Please try again.' }
        return copy
      })
    } finally {
      setStreaming(false)
    }
  }, [input, messages, streaming, workflowId])

  const reset = () => {
    setMessages([{ role: 'assistant', content: WELCOME, timestamp: new Date().toISOString() }])
    setWorkflowId(null)
    setProbableAssets([])
    setPhase('intake')
  }

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() }
  }

  return (
    <div className="flex flex-col h-full">
      <Topbar
        title="Asset Recovery Agent"
        subtitle="AI-powered dormant pension & account finder"
        userName={session?.user?.name ?? ''}
        actions={
          <Button variant="ghost" size="sm" onClick={reset}>
            <RotateCcw size={14} /> New session
          </Button>
        }
      />

      <div className="flex-1 flex flex-col md:flex-row gap-0 min-h-0">
        {/* Chat panel */}
        <div className="flex-1 flex flex-col min-h-0">
          {/* Agent info bar */}
          <div className="px-4 md:px-6 py-3 bg-indigo-50 border-b border-indigo-100 flex items-center gap-3">
            <div className="w-7 h-7 rounded-full bg-indigo-500 flex items-center justify-center">
              <Search size={13} className="text-white" />
            </div>
            <div>
              <p className="text-xs font-semibold text-indigo-700">Vaultly Recovery Agent</p>
              <p className="text-[10px] text-indigo-500">Powered by Claude · Conversation is private & encrypted</p>
            </div>
            <div className="ml-auto">
              {phase === 'complete' ? (
                <Badge variant="success"><CheckCircle size={10} className="mr-1" />Analysis complete</Badge>
              ) : streaming ? (
                <Badge variant="info">Thinking…</Badge>
              ) : (
                <Badge variant="default">Gathering history</Badge>
              )}
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 md:px-6 py-5 space-y-4">
            {messages.map((msg, i) => <MessageBubble key={i} msg={msg} />)}
            {streaming && messages[messages.length - 1]?.content === '' && (
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center">
                  <Bot size={14} className="text-slate-600" />
                </div>
                <div className="bg-white border border-slate-100 rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm">
                  <div className="flex gap-1 items-center h-5">
                    <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="px-4 md:px-6 py-4 border-t border-slate-100 bg-white">
            <div className="flex gap-3 items-end">
              <textarea
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKey}
                placeholder="Tell me about your employment history…"
                rows={1}
                disabled={streaming}
                className="flex-1 resize-none rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all max-h-32 overflow-y-auto"
                style={{ minHeight: 44 }}
              />
              <Button onClick={send} loading={streaming} size="md" className="rounded-2xl shrink-0 h-11">
                <Send size={15} />
              </Button>
            </div>
            <p className="text-[10px] text-slate-400 mt-2 text-center">Press Enter to send · Shift+Enter for new line · NI numbers are never stored in chat</p>
          </div>
        </div>

        {/* Results panel */}
        {probableAssets.length > 0 && (
          <div className="w-full md:w-80 border-t md:border-t-0 md:border-l border-slate-100 bg-slate-50 overflow-y-auto">
            <div className="px-4 py-5">
              <div className="flex items-center gap-2 mb-4">
                <CheckCircle size={16} className="text-emerald-500" />
                <h2 className="font-semibold text-slate-800 text-sm">Probable Assets Found</h2>
                <span className="ml-auto text-xs font-bold text-indigo-500 bg-indigo-50 px-2 py-0.5 rounded-full">{probableAssets.length}</span>
              </div>
              <div className="space-y-3">
                {probableAssets.map((a, i) => <ProbableAssetCard key={i} asset={a} />)}
              </div>
              <div className="mt-4 p-3 bg-amber-50 rounded-xl border border-amber-100">
                <div className="flex gap-2">
                  <AlertCircle size={14} className="text-amber-600 shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-700">These are probable matches based on your history. Contact each tracing service to confirm. Seek independent financial advice for pensions over £30,000.</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
