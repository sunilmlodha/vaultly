'use client'
import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { Topbar } from '@/components/layout/topbar'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { formatCurrency, formatDate } from '@/lib/utils'
import {
  Building2,
  Loader2,
  RefreshCw,
  AlertTriangle,
  Sparkles,
  X,
  CheckCheck,
  Plus,
} from 'lucide-react'
import type { OpenBankingConnection, DetectedRecurring } from '@/lib/types'

function getDaysUntil(dateStr: string): number {
  return Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86400000)
}

export default function ConnectionsPage() {
  const { data: session } = useSession()
  const [connections, setConnections] = useState<OpenBankingConnection[]>([])
  const [suggestions, setSuggestions] = useState<DetectedRecurring[]>([])
  const [syncing, setSyncing] = useState<string | null>(null)
  const [connecting, setConnecting] = useState(false)
  const [dismissedSuggestions, setDismissedSuggestions] = useState(false)
  const [approvingAll, setApprovingAll] = useState(false)
  const [approvingOne, setApprovingOne] = useState<string | null>(null)
  const [loadingPage, setLoadingPage] = useState(true)

  const load = useCallback(async () => {
    try {
      const [connRes, recurRes] = await Promise.all([
        fetch('/api/connections'),
        fetch('/api/connections/recurring'),
      ])
      const connData = await connRes.json()
      const recurData = await recurRes.json()
      setConnections(connData.connections || [])
      setSuggestions(recurData.suggestions || [])
    } finally {
      setLoadingPage(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const connectBank = async () => {
    setConnecting(true)
    try {
      const res = await fetch('/api/connections/auth')
      const { url } = await res.json()
      window.location.href = url
    } catch {
      setConnecting(false)
    }
  }

  const sync = async (id: string) => {
    setSyncing(id)
    await fetch(`/api/connections/${id}/sync`, { method: 'POST' })
    setSyncing(null)
    load()
  }

  const reauthorise = async () => {
    const res = await fetch('/api/connections/auth')
    const { url } = await res.json()
    window.location.href = url
  }

  const disconnect = async (id: string, name: string) => {
    if (!confirm(`Disconnect ${name}? Your synced accounts will remain but stop updating.`)) return
    await fetch(`/api/connections/${id}`, { method: 'DELETE' })
    load()
  }

  const approveAll = async () => {
    setApprovingAll(true)
    try {
      await fetch('/api/connections/recurring', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ suggestions }),
      })
      setDismissedSuggestions(true)
      setSuggestions([])
    } finally {
      setApprovingAll(false)
    }
  }

  const approveOne = async (suggestion: DetectedRecurring) => {
    setApprovingOne(suggestion.merchant_key)
    try {
      await fetch('/api/connections/recurring', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ suggestions: [suggestion] }),
      })
      setSuggestions((prev) => prev.filter((s) => s.merchant_key !== suggestion.merchant_key))
    } finally {
      setApprovingOne(null)
    }
  }

  const expiringConnections = connections.filter((c) => {
    const daysLeft = getDaysUntil(c.consent_expires_at)
    return daysLeft <= 14 && daysLeft > 0
  })

  const statusBadge = (status: OpenBankingConnection['status']) => {
    switch (status) {
      case 'active':
        return <Badge variant="success">Active</Badge>
      case 'expired':
        return <Badge variant="danger">Expired</Badge>
      case 'revoked':
        return <Badge variant="danger">Revoked</Badge>
      case 'error':
        return <Badge variant="warning">Error</Badge>
    }
  }

  return (
    <div>
      <Topbar
        title="Connected Banks"
        subtitle={`${connections.length} connection${connections.length !== 1 ? 's' : ''}`}
        userName={session?.user?.name ?? ''}
        actions={
          <Button onClick={connectBank} disabled={connecting} size="sm">
            {connecting ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Building2 size={14} />
            )}
            Connect a bank
          </Button>
        }
      />

      <div className="p-4 md:p-8 space-y-6 animate-fade-in">

        {/* Consent expiry warning */}
        {expiringConnections.length > 0 && (
          <Card className="border-amber-200 bg-amber-50">
            <CardContent className="py-4 flex items-start gap-3">
              <AlertTriangle size={18} className="text-amber-500 mt-0.5 shrink-0" />
              <div>
                <p className="font-semibold text-amber-800 text-sm">
                  Consent expiring soon
                </p>
                <p className="text-amber-700 text-xs mt-0.5">
                  {expiringConnections.map((c) => c.bank_name).join(', ')}{' '}
                  {expiringConnections.length === 1 ? 'needs' : 'need'} re-authorisation within 14 days.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Connection list or empty state */}
        {loadingPage ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={28} className="text-indigo-400 animate-spin" />
          </div>
        ) : connections.length === 0 ? (
          <Card>
            <CardContent className="py-20 text-center">
              <div className="w-14 h-14 rounded-2xl bg-indigo-50 flex items-center justify-center mx-auto mb-4">
                <Building2 size={28} className="text-indigo-400" />
              </div>
              <p className="text-slate-600 font-semibold text-lg mb-1">No banks connected yet</p>
              <p className="text-slate-400 text-sm mb-5 max-w-xs mx-auto">
                Connect your bank to get live balances and automatic renewal detection
              </p>
              <Button onClick={connectBank} disabled={connecting}>
                {connecting ? <Loader2 size={14} className="animate-spin" /> : <Building2 size={14} />}
                Connect a bank
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {connections.map((c) => {
              const consentDays = getDaysUntil(c.consent_expires_at)
              const consentSoon = consentDays <= 7
              return (
                <Card key={c.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="py-4">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                      {/* Left: identity */}
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center shrink-0">
                          {c.bank_logo_url ? (
                            <img
                              src={c.bank_logo_url}
                              alt={c.bank_name}
                              className="w-7 h-7 object-contain"
                            />
                          ) : (
                            <Building2 size={20} className="text-indigo-500" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-semibold text-slate-800">{c.bank_name}</p>
                            {statusBadge(c.status)}
                          </div>
                          {c.account_count !== undefined && (
                            <p className="text-xs text-slate-400 mt-0.5">
                              {c.account_count} account{c.account_count !== 1 ? 's' : ''} linked
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Middle: dates */}
                      <div className="text-sm space-y-0.5 shrink-0">
                        {c.last_synced_at && (
                          <p className="text-xs text-slate-400">
                            Last synced: {formatDate(c.last_synced_at)}
                          </p>
                        )}
                        <p className={`text-xs ${consentSoon ? 'text-amber-600 font-medium' : 'text-slate-400'}`}>
                          Consent expires: {formatDate(c.consent_expires_at)}
                          {consentSoon && ` (${consentDays}d)`}
                        </p>
                      </div>

                      {/* Right: actions */}
                      <div className="flex items-center gap-2 shrink-0">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => sync(c.id)}
                          disabled={syncing === c.id}
                        >
                          {syncing === c.id ? (
                            <Loader2 size={13} className="animate-spin" />
                          ) : (
                            <RefreshCw size={13} />
                          )}
                          Sync
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={reauthorise}
                        >
                          Re-authorise
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-400 hover:text-red-600 hover:bg-red-50"
                          onClick={() => disconnect(c.id, c.bank_name)}
                        >
                          Disconnect
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}

        {/* Recurring suggestions banner */}
        {suggestions.length > 0 && !dismissedSuggestions && (
          <Card className="border-emerald-200 bg-emerald-50">
            <CardHeader className="pb-3 pt-5 px-5">
              <div className="flex items-center justify-between gap-3">
                <CardTitle className="text-base font-semibold text-emerald-800 flex items-center gap-2">
                  <Sparkles size={16} className="text-emerald-500" />
                  {suggestions.length} recurring payment{suggestions.length !== 1 ? 's' : ''} detected
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    onClick={approveAll}
                    disabled={approvingAll}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white"
                  >
                    {approvingAll ? (
                      <Loader2 size={13} className="animate-spin" />
                    ) : (
                      <CheckCheck size={13} />
                    )}
                    Add all
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setDismissedSuggestions(true)}
                    className="text-emerald-700 hover:bg-emerald-100"
                  >
                    <X size={13} />
                    Dismiss
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pb-5 px-5 space-y-2">
              {suggestions.map((s) => (
                <div
                  key={s.merchant_key}
                  className="flex items-center justify-between bg-white rounded-xl px-4 py-3 border border-emerald-100"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div>
                      <p className="font-medium text-slate-800 text-sm">{s.name}</p>
                      <p className="text-xs text-slate-400">
                        {formatCurrency(s.amount, s.currency)}/mo
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge variant="default" className="text-[10px]">
                      {s.transaction_count} transactions
                    </Badge>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => approveOne(s)}
                      disabled={approvingOne === s.merchant_key}
                    >
                      {approvingOne === s.merchant_key ? (
                        <Loader2 size={12} className="animate-spin" />
                      ) : (
                        <Plus size={12} />
                      )}
                      Add
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
