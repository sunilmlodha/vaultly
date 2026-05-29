'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { Topbar } from '@/components/layout/topbar'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import {
  Send, Bot, User, RotateCcw, ArrowLeft, Sparkles,
  Copy, CheckCheck, ExternalLink, TrendingDown, Zap,
} from 'lucide-react'
import { formatCurrency, getDaysUntil } from '@/lib/utils'
import type { AgentMessage, Renewal } from '@/lib/types'
import type { NegotiationOutput } from '@/lib/claude/renewal-agent'

// ─── helpers ─────────────────────────────────────────────────────────────────

const RECOMMENDATION_META: Record<string, { label: string; color: string }> = {
  cancel: { label: 'Cancel recommended', color: 'text-red-600 bg-red-50 border-red-200' },
  negotiate: { label: 'Negotiate recommended', color: 'text-amber-700 bg-amber-50 border-amber-200' },
  switch: { label: 'Switch recommended', color: 'text-indigo-600 bg-indigo-50 border-indigo-200' },
}

function getDaysVariant(days: number): 'danger' | 'warning' | 'info' | 'default' {
  return days <= 7 ? 'danger' : days <= 14 ? 'warning' : days <= 30 ? 'info' : 'default'
}

function MessageBubble({ msg }: { msg: AgentMessage }) {
  const isUser = msg.role === 'user'
  const display = msg.content.replace(/```json[\s\S]*?```/g, '').trim()
  if (!display) return null
  return (
    <div className={`flex gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
      <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
        isUser ? 'bg-indigo-100' : 'bg-emerald-100'
      }`}>
        {isUser
          ? <User size={14} className="text-indigo-600" />
          : <Sparkles size={14} className="text-emerald-600" />}
      </div>
      <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
        isUser
          ? 'bg-indigo-500 text-white rounded-tr-sm'
          : 'bg-white border border-slate-100 text-slate-700 rounded-tl-sm shadow-sm'
      }`}>
        {display}
      </div>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function NegotiatePage() {
  const { id: renewalId } = useParams<{ id: string }>()
  const router = useRouter()
  const { data: session } = useSession()

  const [renewal, setRenewal] = useState<Renewal | null>(null)
  const [messages, setMessages] = useState<AgentMessage[]>([])
  const [input, setInput] = useState('')
  const [streaming, setStreaming] = useState(false)
  const [negotiationId, setNegotiationId] = useState<string | null>(null)
  const [output, setOutput] = useState<NegotiationOutput | null>(null)
  const [copied, setCopied] = useState(false)
  const [initialised, setInitialised] = useState(false)

  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  // Load renewal + any existing negotiation
  useEffect(() => {
    if (!renewalId) return
    const load = async () => {
      const [renewalRes, negRes] = await Promise.all([
        fetch('/api/renewals'),
        fetch(`/api/renewals/negotiate?renewalId=${renewalId}`),
      ])
      const { renewals } = await renewalRes.json()
      const found = (renewals as Renewal[]).find(r => r.id === renewalId)
      if (!found) { router.push('/renewals'); return }
      setRenewal(found)

      const { negotiation } = await negRes.json()
      if (negotiation && negotiation.messages?.length > 0) {
        setMessages(negotiation.messages)
        setNegotiationId(negotiation.id)
        if (negotiation.draft_letter) {
          setOutput({ draft_letter: negotiation.draft_letter })
        }
        setInitialised(true)
      } else {
        // Kick off the initial analysis automatically
        setInitialised(false)
      }
    }
    load()
  }, [renewalId, router])

  // Auto-trigger analysis once renewal is loaded (first visit)
  useEffect(() => {
    if (!renewal || initialised) return
    setInitialised(true)
    const trigger: AgentMessage = {
      role: 'user',
      content: `Please analyse my ${renewal.category} renewal for ${renewal.name}${renewal.provider ? ` with ${renewal.provider}` : ''} at £${renewal.amount.toFixed(2)}/year, due ${renewal.renewal_date}. Is this competitive? How much could I save? What's my best move?`,
      timestamp: new Date().toISOString(),
    }
    sendMessages([trigger], true)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [renewal, initialised])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, streaming])

  const sendMessages = useCallback(async (msgs: AgentMessage[], isAutoTrigger = false) => {
    setStreaming(true)
    const placeholder: AgentMessage = { role: 'assistant', content: '', timestamp: new Date().toISOString() }
    // For auto-trigger, don't show the user bubble; for normal sends, show it
    setMessages(prev => isAutoTrigger ? [placeholder] : [...prev, ...msgs, placeholder])

    try {
      const res = await fetch('/api/renewals/negotiate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: msgs, renewalId, negotiationId }),
      })

      const reader = res.body!.getReader()
      const decoder = new TextDecoder()
      let accText = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const raw = decoder.decode(value)
        for (const line of raw.split('\n').filter(l => l.startsWith('data: '))) {
          const data = JSON.parse(line.slice(6))
          if (data.type === 'chunk') {
            accText += data.text
            setMessages(prev => {
              const copy = [...prev]
              copy[copy.length - 1] = { ...copy[copy.length - 1], content: accText }
              return copy
            })
          } else if (data.type === 'negotiation_id') {
            setNegotiationId(data.id)
          } else if (data.type === 'output') {
            setOutput(data.output)
          } else if (data.type === 'error') {
            setMessages(prev => {
              const copy = [...prev]
              copy[copy.length - 1] = { ...copy[copy.length - 1], content: data.message }
              return copy
            })
          }
        }
      }
    } catch {
      setMessages(prev => {
        const copy = [...prev]
        copy[copy.length - 1] = { ...copy[copy.length - 1], content: 'Something went wrong. Please try again.' }
        return copy
      })
    } finally {
      setStreaming(false)
    }
  }, [renewalId, negotiationId])

  const send = useCallback(async () => {
    if (!input.trim() || streaming) return
    const userMsg: AgentMessage = { role: 'user', content: input.trim(), timestamp: new Date().toISOString() }
    const allMessages = [...messages, userMsg]
    setMessages(allMessages)
    setInput('')
    await sendMessages(allMessages)
  }, [input, messages, streaming, sendMessages])

  const reset = useCallback(async () => {
    setMessages([])
    setNegotiationId(null)
    setOutput(null)
    setInitialised(false)
  }, [])

  const copyLetter = () => {
    if (!output?.draft_letter) return
    navigator.clipboard.writeText(output.draft_letter)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() }
  }

  if (!renewal) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const days = getDaysUntil(renewal.renewal_date)
  const recMeta = output?.recommendation ? RECOMMENDATION_META[output.recommendation] : null

  return (
    <div className="flex flex-col h-full">
      <Topbar
        title="Renewal Negotiation Agent"
        subtitle={`${renewal.name} · ${formatCurrency(renewal.amount, renewal.currency)}/year`}
        userName={session?.user?.name ?? ''}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => router.push('/renewals')}>
              <ArrowLeft size={14} /> Back
            </Button>
            <Button variant="ghost" size="sm" onClick={reset}>
              <RotateCcw size={14} /> Restart
            </Button>
          </div>
        }
      />

      <div className="flex-1 flex flex-col md:flex-row gap-0 min-h-0">

        {/* ── Chat panel ── */}
        <div className="flex-1 flex flex-col min-h-0">

          {/* Renewal context bar */}
          <div className="px-4 md:px-6 py-3 bg-emerald-50 border-b border-emerald-100 flex items-center gap-3 flex-wrap">
            <div className="w-7 h-7 rounded-full bg-emerald-500 flex items-center justify-center shrink-0">
              <Sparkles size={13} className="text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-emerald-700">Vaultly Negotiation Agent</p>
              <p className="text-[10px] text-emerald-500">Powered by Claude · Finds savings, drafts letters</p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant={getDaysVariant(days)}>
                {days < 0 ? 'Overdue' : days === 0 ? 'Today' : `${days}d`}
              </Badge>
              {recMeta && (
                <span className={`text-[10px] font-semibold border px-2 py-0.5 rounded-full ${recMeta.color}`}>
                  {recMeta.label}
                </span>
              )}
              {output?.potential_saving_annual && output.potential_saving_annual > 0 && (
                <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-100 border border-emerald-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <TrendingDown size={9} />
                  Save up to £{output.potential_saving_annual}/yr
                </span>
              )}
              {streaming && <Badge variant="info">Thinking…</Badge>}
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 md:px-6 py-5 space-y-4 bg-slate-50">
            {messages.length === 0 && !streaming && (
              <div className="flex flex-col items-center justify-center h-40 gap-3 text-center">
                <div className="w-12 h-12 rounded-2xl bg-emerald-100 flex items-center justify-center">
                  <Zap size={22} className="text-emerald-500" />
                </div>
                <p className="text-sm font-medium text-slate-600">Analysing your renewal…</p>
                <p className="text-xs text-slate-400">Claude is checking market rates</p>
              </div>
            )}
            {messages.map((msg, i) => <MessageBubble key={i} msg={msg} />)}
            {streaming && messages[messages.length - 1]?.content === '' && (
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center">
                  <Sparkles size={14} className="text-emerald-600" />
                </div>
                <div className="bg-white border border-slate-100 rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm">
                  <div className="flex gap-1 items-center h-5">
                    {[0, 150, 300].map((d) => (
                      <div key={d} className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce"
                        style={{ animationDelay: `${d}ms` }} />
                    ))}
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
                placeholder="Ask a follow-up, request a draft letter, or ask for a negotiation script…"
                rows={1}
                disabled={streaming}
                className="flex-1 resize-none rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all max-h-32 overflow-y-auto"
                style={{ minHeight: 44 }}
              />
              <Button onClick={send} loading={streaming} size="md" className="rounded-2xl shrink-0 h-11 bg-emerald-600 hover:bg-emerald-700">
                <Send size={15} />
              </Button>
            </div>
            <p className="text-[10px] text-slate-400 mt-2 text-center">
              Press Enter to send · Try: "Draft a cancellation letter" or "What should I say when I call?"
            </p>
          </div>
        </div>

        {/* ── Right panel: renewal details + draft letter ── */}
        <div className="w-full md:w-80 border-t md:border-t-0 md:border-l border-slate-100 bg-white overflow-y-auto">
          <div className="px-4 py-5 space-y-4">

            {/* Renewal summary card */}
            <Card className="border-slate-200">
              <CardContent className="py-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-semibold text-slate-800">{renewal.name}</p>
                    {renewal.provider && <p className="text-xs text-slate-400">{renewal.provider}</p>}
                  </div>
                  <Badge variant="default" className="capitalize">{renewal.category}</Badge>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="bg-slate-50 rounded-xl p-2.5">
                    <p className="text-slate-400 mb-0.5">Annual cost</p>
                    <p className="font-bold text-slate-800">{formatCurrency(renewal.amount, renewal.currency)}</p>
                  </div>
                  <div className="bg-slate-50 rounded-xl p-2.5">
                    <p className="text-slate-400 mb-0.5">Monthly</p>
                    <p className="font-bold text-slate-800">{formatCurrency(renewal.amount / 12, renewal.currency)}</p>
                  </div>
                  <div className="bg-slate-50 rounded-xl p-2.5 col-span-2">
                    <p className="text-slate-400 mb-0.5">Renewal date</p>
                    <p className="font-bold text-slate-800">{renewal.renewal_date}
                      <span className="ml-2 font-normal text-slate-400">
                        ({days < 0 ? `${Math.abs(days)}d overdue` : days === 0 ? 'today' : `${days}d`})
                      </span>
                    </p>
                  </div>
                </div>
                {renewal.auto_renews && (
                  <p className="text-[10px] text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-2.5 py-1.5">
                    Auto-renews — act before {renewal.renewal_date} to avoid rollover
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Quick prompts */}
            {messages.length > 0 && !output?.draft_letter && (
              <div className="space-y-2">
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Quick actions</p>
                {[
                  'Draft a cancellation letter',
                  'Write a negotiation script for calling them',
                  'Show me the best comparison sites',
                ].map((prompt) => (
                  <button
                    key={prompt}
                    onClick={() => { setInput(prompt); inputRef.current?.focus() }}
                    className="w-full text-left text-xs text-slate-600 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl px-3 py-2 transition-colors"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            )}

            {/* Draft letter panel */}
            {output?.draft_letter && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                    <CheckCheck size={13} className="text-emerald-500" />
                    Draft {output.letter_type ?? 'letter'} ready
                  </p>
                  <Button variant="ghost" size="sm" onClick={copyLetter} className="text-slate-500 h-7 px-2">
                    {copied ? <CheckCheck size={13} className="text-emerald-500" /> : <Copy size={13} />}
                    {copied ? 'Copied' : 'Copy'}
                  </Button>
                </div>
                <pre className="text-[11px] text-slate-700 bg-slate-50 border border-slate-200 rounded-xl p-3 whitespace-pre-wrap font-sans leading-relaxed max-h-80 overflow-y-auto">
                  {output.draft_letter}
                </pre>
              </div>
            )}

            {/* Comparison sites */}
            {output?.comparison_sites && output.comparison_sites.length > 0 && (
              <div className="space-y-2">
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Compare prices</p>
                {output.comparison_sites.map((site) => (
                  <a
                    key={site.url}
                    href={site.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between w-full text-xs text-indigo-600 bg-indigo-50 hover:bg-indigo-100 border border-indigo-100 rounded-xl px-3 py-2 transition-colors"
                  >
                    {site.name}
                    <ExternalLink size={11} />
                  </a>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
