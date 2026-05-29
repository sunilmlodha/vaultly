'use client'
import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Topbar } from '@/components/layout/topbar'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Modal } from '@/components/ui/modal'
import { formatCurrency, formatDate, getDaysUntil } from '@/lib/utils'
import { Plus, RefreshCw, Trash2, Pencil, Sparkles, X, CheckCheck, Loader2 } from 'lucide-react'
import type { Renewal, DetectedRecurring } from '@/lib/types'

const blank = { name: '', category: 'subscription', amount: '', currency: 'GBP', renewal_date: '', provider: '', auto_renews: 'true' }

export default function RenewalsPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const t = useTranslations('renewals')
  const tc = useTranslations('common')
  const [items, setItems] = useState<Renewal[]>([])
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Renewal | null>(null)
  const [form, setForm] = useState(blank)
  const [loading, setLoading] = useState(false)
  const [suggestions, setSuggestions] = useState<DetectedRecurring[]>([])
  const [dismissedSuggestions, setDismissedSuggestions] = useState(false)
  const [approvingAll, setApprovingAll] = useState(false)
  const [approvingOne, setApprovingOne] = useState<string | null>(null)

  const NEGOTIATION_BADGE: Record<string, { label: string; variant: 'danger' | 'warning' | 'info' | 'default' }> = {
    cancel:    { label: t('negotiationStatus.cancel'), variant: 'danger' },
    negotiate: { label: t('negotiationStatus.negotiate'), variant: 'warning' },
    switch:    { label: t('negotiationStatus.switch'), variant: 'info' },
  }

  const CATEGORIES = [
    { value: 'subscription', label: t('category.subscription') },
    { value: 'insurance', label: t('category.insurance') },
    { value: 'utility', label: t('category.utility') },
    { value: 'broadband', label: t('category.broadband') },
    { value: 'mobile', label: t('category.mobile') },
    { value: 'other', label: t('category.other') },
  ]

  const load = useCallback(async () => {
    const res = await fetch('/api/renewals')
    const { renewals } = await res.json()
    setItems(renewals || [])
  }, [])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    fetch('/api/connections/recurring')
      .then(r => r.json())
      .then(d => setSuggestions(d.suggestions || []))
      .catch(() => {})
  }, [])

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
      setSuggestions(prev => prev.filter(s => s.merchant_key !== suggestion.merchant_key))
    } finally {
      setApprovingOne(null)
    }
  }

  const openAdd = () => { setEditing(null); setForm(blank); setOpen(true) }
  const openEdit = (r: Renewal) => {
    setEditing(r)
    setForm({ name: r.name, category: r.category, amount: String(r.amount), currency: r.currency, renewal_date: r.renewal_date, provider: r.provider || '', auto_renews: String(r.auto_renews) })
    setOpen(true)
  }

  const save = async () => {
    setLoading(true)
    const payload = { name: form.name, category: form.category, amount: parseFloat(form.amount) || 0, currency: form.currency, renewal_date: form.renewal_date, provider: form.provider, auto_renews: form.auto_renews === 'true' }
    if (editing) {
      await fetch('/api/renewals', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: editing.id, ...payload }) })
    } else {
      await fetch('/api/renewals', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
    }
    setOpen(false); setLoading(false); load()
  }

  const del = async (id: string) => {
    if (!confirm(t('deleteConfirm'))) return
    await fetch('/api/renewals', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) })
    load()
  }

  const getDaysVariant = (days: number): 'danger' | 'warning' | 'info' | 'default' =>
    days <= 7 ? 'danger' : days <= 14 ? 'warning' : days <= 30 ? 'info' : 'default'

  return (
    <div>
      <Topbar title={t('title')} subtitle={`${items.length} ${t('subtitle')}`} userName={session?.user?.name ?? ''}
        actions={<Button onClick={openAdd} size="sm"><Plus size={14} /> {tc('add')}</Button>} />
      <div className="p-4 md:p-8 animate-fade-in space-y-6">

        {/* Recurring suggestions banner */}
        {suggestions.length > 0 && !dismissedSuggestions && (
          <Card className="border-emerald-200 bg-emerald-50">
            <CardHeader className="pb-3 pt-5 px-5">
              <div className="flex items-center justify-between gap-3">
                <CardTitle className="text-base font-semibold text-emerald-800 flex items-center gap-2">
                  <Sparkles size={16} className="text-emerald-500" />
                  {`${suggestions.length} ${suggestions.length !== 1 ? t('detectedFromBankPlural') : t('detectedFromBank')}`}
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
                    {tc('addAll')}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setDismissedSuggestions(true)}
                    className="text-emerald-700 hover:bg-emerald-100"
                  >
                    <X size={13} />
                    {tc('dismiss')}
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
                  <div className="min-w-0">
                    <p className="font-medium text-slate-800 text-sm">{s.name}</p>
                    <p className="text-xs text-slate-400">
                      {formatCurrency(s.amount, s.currency)}{tc('perMonth')}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge variant="default" className="text-[10px]">
                      {s.transaction_count} {tc('transactions')}
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
                      {tc('add')}
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        <div>
        {items.length === 0 ? (
          <Card><CardContent className="py-16 text-center">
            <RefreshCw size={32} className="text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 font-medium">{t('empty')}</p>
            <Button onClick={openAdd} size="sm" className="mt-4"><Plus size={14} /> {t('addRenewal')}</Button>
          </CardContent></Card>
        ) : (
          <div className="space-y-3">
            {items.map((r) => {
              const days = getDaysUntil(r.renewal_date)
              return (
                <Card key={r.id} className={`hover:shadow-md transition-shadow ${days <= 7 && days >= 0 ? 'border-red-200' : ''}`}>
                  <CardContent className="py-4 flex items-center justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-slate-800">{r.name}</p>
                        <Badge variant="default">{r.category}</Badge>
                        {r.auto_renews && <Badge variant="info">{t('autoRenews')}</Badge>}
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">{r.provider && `${r.provider} · `}{t('due')} {formatDate(r.renewal_date)}</p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <div className="text-right">
                        <p className="font-bold text-slate-800">{formatCurrency(Number(r.amount), r.currency)}</p>
                        <Badge variant={getDaysVariant(days)}>
                          {days < 0 ? t('overdue') : days === 0 ? t('today') : `${days}d`}
                        </Badge>
                      </div>
                      {/* Negotiation status badge */}
                      {r.negotiation_status && NEGOTIATION_BADGE[r.negotiation_status] && (
                        <Badge variant={NEGOTIATION_BADGE[r.negotiation_status].variant} className="hidden sm:flex">
                          {NEGOTIATION_BADGE[r.negotiation_status].label}
                        </Badge>
                      )}
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => router.push(`/renewals/negotiate/${r.id}`)}
                          className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                          title={t('aiNegotiation')}
                        >
                          <Sparkles size={13} />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => openEdit(r)}><Pencil size={13} /></Button>
                        <Button variant="ghost" size="sm" onClick={() => del(r.id)} className="text-red-400 hover:text-red-600 hover:bg-red-50"><Trash2 size={13} /></Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
        </div>
      </div>
      <Modal open={open} onClose={() => setOpen(false)} title={editing ? t('editModal') : t('addModal')}>
        <div className="space-y-4">
          <Input label={t('form.name')} placeholder={t('form.namePlaceholder')} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
          <Select label={t('form.category')} value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} options={CATEGORIES} />
          <div className="grid grid-cols-2 gap-3">
            <Input label={t('form.amount')} type="number" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} />
            <Input label={t('form.renewalDate')} type="date" value={form.renewal_date} onChange={e => setForm(f => ({ ...f, renewal_date: e.target.value }))} />
          </div>
          <Input label={t('form.provider')} value={form.provider} onChange={e => setForm(f => ({ ...f, provider: e.target.value }))} />
          <Select label={t('form.autoRenews')} value={form.auto_renews} onChange={e => setForm(f => ({ ...f, auto_renews: e.target.value }))} options={[{ value: 'true', label: t('autoRenewsOptions.yes') }, { value: 'false', label: t('autoRenewsOptions.no') }]} />
          <div className="flex gap-3 pt-2">
            <Button variant="secondary" onClick={() => setOpen(false)} className="flex-1">{tc('cancel')}</Button>
            <Button onClick={save} loading={loading} className="flex-1">{editing ? tc('save') : t('addRenewal')}</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
