'use client'
import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useTranslations } from 'next-intl'
import { Topbar } from '@/components/layout/topbar'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Modal } from '@/components/ui/modal'
import { formatCurrency, formatDate } from '@/lib/utils'
import { Plus, Pencil, Trash2, Wallet, Landmark, RefreshCw } from 'lucide-react'
import type { Asset, AssetCategory } from '@/lib/types'

const BADGE: Record<string, 'purple' | 'success' | 'info' | 'warning' | 'danger' | 'default'> = {
  bank_account: 'info',
  investment: 'success', etf: 'success', bonds: 'success',
  pension: 'purple', sipp: 'purple', riester: 'purple',
  isa_cash: 'info', isa_ss: 'success', isa_lifetime: 'success', isa_junior: 'info',
  pea: 'success', assurance_vie: 'success', livret_a: 'info',
  property: 'warning',
  crypto: 'danger',
  insurance: 'default', other: 'default',
}

function getDefaultCurrency() {
  if (typeof window === 'undefined') return 'GBP'
  return localStorage.getItem('vaultly_currency') || 'GBP'
}

const blank = { name: '', category: 'bank_account' as AssetCategory, value: '', currency: 'GBP', institution: '', notes: '' }

export default function AssetsPage() {
  const { data: session } = useSession()
  const t = useTranslations('assets')
  const tc = useTranslations('common')
  const [assets, setAssets] = useState<Asset[]>([])
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Asset | null>(null)
  const [form, setForm] = useState(blank)
  const [loading, setLoading] = useState(false)

  const CATEGORIES: { value: AssetCategory | string; label: string; group?: string }[] = [
    // ── Core ────────────────────────────────────────────────────────────────
    { value: 'bank_account', label: t('category.bank_account') },
    { value: 'property', label: t('category.property') },
    { value: 'crypto', label: t('category.crypto') },
    { value: 'insurance', label: t('category.insurance') },
    { value: 'other', label: t('category.other') },
    // ── UK Pensions ──────────────────────────────────────────────────────────
    { value: 'pension', label: t('category.pension'), group: t('categoryGroup.ukPensions') },
    { value: 'sipp', label: t('category.sipp'), group: t('categoryGroup.ukPensions') },
    // ── UK ISA ───────────────────────────────────────────────────────────────
    { value: 'isa_cash', label: t('category.isa_cash'), group: t('categoryGroup.ukIsa') },
    { value: 'isa_ss', label: t('category.isa_ss'), group: t('categoryGroup.ukIsa') },
    { value: 'isa_lifetime', label: t('category.isa_lifetime'), group: t('categoryGroup.ukIsa') },
    { value: 'isa_junior', label: t('category.isa_junior'), group: t('categoryGroup.ukIsa') },
    // ── UK/Global Investments ─────────────────────────────────────────────────
    { value: 'investment', label: t('category.investment'), group: t('categoryGroup.ukGlobal') },
    { value: 'etf', label: t('category.etf'), group: t('categoryGroup.ukGlobal') },
    { value: 'bonds', label: t('category.bonds'), group: t('categoryGroup.ukGlobal') },
    // ── France ───────────────────────────────────────────────────────────────
    { value: 'pea', label: t('category.pea'), group: t('categoryGroup.france') },
    { value: 'assurance_vie', label: t('category.assurance_vie'), group: t('categoryGroup.france') },
    { value: 'livret_a', label: t('category.livret_a'), group: t('categoryGroup.france') },
    // ── Germany ──────────────────────────────────────────────────────────────
    { value: 'riester', label: t('category.riester'), group: t('categoryGroup.germany') },
  ]

  const connectBank = async () => {
    const res = await fetch('/api/connections/auth')
    const { url } = await res.json()
    window.location.href = url
  }

  const load = useCallback(async () => {
    const res = await fetch('/api/assets')
    const { assets: data } = await res.json()
    setAssets(data || [])
  }, [])

  useEffect(() => { load() }, [load])

  const openAdd = () => { setEditing(null); setForm({ name: '', category: 'bank_account' as AssetCategory, value: '', currency: getDefaultCurrency(), institution: '', notes: '' }); setOpen(true) }
  const openEdit = (a: Asset) => {
    setEditing(a)
    setForm({ name: a.name, category: a.category, value: String(a.value), currency: a.currency, institution: a.institution || '', notes: a.notes || '' })
    setOpen(true)
  }

  const save = async () => {
    setLoading(true)
    const payload = { ...form, value: parseFloat(form.value) || 0 }
    if (editing) {
      await fetch('/api/assets', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: editing.id, ...payload }) })
    } else {
      await fetch('/api/assets', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
    }
    setOpen(false); setLoading(false); load()
  }

  const del = async (id: string) => {
    if (!confirm(t('deleteConfirm'))) return
    await fetch('/api/assets', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) })
    load()
  }

  const total = assets.reduce((s, a) => s + Number(a.value), 0)

  return (
    <div>
      <Topbar title={t('title')} subtitle={`${assets.length} ${t('title').toLowerCase()} · ${formatCurrency(total)}`} userName={session?.user?.name ?? ''}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={connectBank}><Landmark size={14} /> {t('connectBank')}</Button>
            <Button onClick={openAdd} size="sm"><Plus size={14} /> {t('addAsset')}</Button>
          </div>
        } />
      <div className="p-4 md:p-8 space-y-4 animate-fade-in">
        {assets.length === 0 ? (
          <Card><CardContent className="py-16 text-center">
            <Wallet size={32} className="text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 font-medium">{t('empty')}</p>
            <p className="text-slate-400 text-sm mb-4">{t('emptyDesc')}</p>
            <Button onClick={openAdd} size="sm"><Plus size={14} /> {t('addAsset')}</Button>
          </CardContent></Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {assets.map((a) => (
              <Card key={a.id} className="hover:shadow-md transition-shadow">
                <CardContent className="pt-5">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="font-semibold text-slate-800">{a.name}</p>
                      {a.institution && <p className="text-xs text-slate-400 mt-0.5">{a.institution}</p>}
                    </div>
                    <div className="flex items-center gap-1.5">
                      {a.ob_account_id && (
                        <Badge variant="info" className="flex items-center gap-1">
                          <RefreshCw size={9} /> {t('live')}
                        </Badge>
                      )}
                      <Badge variant={BADGE[a.category]}>{CATEGORIES.find(c => c.value === a.category)?.label}</Badge>
                    </div>
                  </div>
                  <p className="text-2xl font-bold text-indigo-600">{formatCurrency(Number(a.value), a.currency)}</p>
                  {a.ob_account_id && (
                    <p className="text-xs text-indigo-400 mt-0.5 flex items-center gap-1">
                      <RefreshCw size={9} /> {t('liveBalance')}
                    </p>
                  )}
                  <p className="text-xs text-slate-400 mt-1">{`${t('added')} ${formatDate(a.created_at)}`}</p>
                  <div className="flex gap-2 mt-4">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openEdit(a)}
                      disabled={!!a.ob_account_id}
                      title={a.ob_account_id ? t('syncedFromBank') : undefined}
                    >
                      <Pencil size={13} /> {tc('edit')}
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => del(a.id)} className="text-red-400 hover:text-red-600 hover:bg-red-50"><Trash2 size={13} /></Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
      <Modal open={open} onClose={() => setOpen(false)} title={editing ? t('editModal') : t('addModal')}>
        <div className="space-y-4">
          <Input label={t('form.name')} placeholder={t('form.namePlaceholder')} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
          <Select label={t('form.category')} value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value as AssetCategory }))} options={CATEGORIES} />
          <div className="grid grid-cols-2 gap-3">
            <Input label={t('form.value')} type="number" placeholder="0" value={form.value} onChange={e => setForm(f => ({ ...f, value: e.target.value }))} />
            <Input label={t('form.currency')} placeholder={t('form.currencyPlaceholder')} value={form.currency} onChange={e => setForm(f => ({ ...f, currency: e.target.value }))} />
          </div>
          <Input label={t('form.institution')} placeholder={t('form.institutionPlaceholder')} value={form.institution} onChange={e => setForm(f => ({ ...f, institution: e.target.value }))} />
          <div className="flex gap-3 pt-2">
            <Button variant="secondary" onClick={() => setOpen(false)} className="flex-1">{tc('cancel')}</Button>
            <Button onClick={save} loading={loading} className="flex-1">{editing ? tc('saveChanges') : t('addAsset')}</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
