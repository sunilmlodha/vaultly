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
import { Plus, Pencil, Trash2, CreditCard, Landmark, RefreshCw, Home, AlertTriangle } from 'lucide-react'
import type { Liability, LiabilityCategory } from '@/lib/types'

const blank = {
  name: '', category: 'loan' as LiabilityCategory, balance: '', currency: 'GBP',
  interest_rate: '', monthly_payment: '', institution: '',
  property_value: '', fixed_rate_end_date: '', mortgage_term_years: '',
}

// Calculate LTV for mortgage items
function calcLtv(balance: number, propertyValue: number | null): number | null {
  if (!propertyValue || propertyValue <= 0) return null
  return Math.round((balance / propertyValue) * 100 * 10) / 10
}

// Check if fixed rate ends within 6 months
function remortgageAlert(fixedRateEndDate: string | null | undefined): { urgent: boolean; months: number } | null {
  if (!fixedRateEndDate) return null
  const end = new Date(fixedRateEndDate)
  const now = new Date()
  const monthsLeft = Math.round((end.getTime() - now.getTime()) / (30 * 24 * 60 * 60 * 1000))
  if (monthsLeft <= 6 && monthsLeft >= -1) return { urgent: monthsLeft <= 3, months: monthsLeft }
  return null
}

function getDefaultCurrency() {
  if (typeof window === 'undefined') return 'GBP'
  return localStorage.getItem('vaultly_currency') || 'GBP'
}

export default function LiabilitiesPage() {
  const { data: session } = useSession()
  const t = useTranslations('liabilities')
  const tc = useTranslations('common')
  const [items, setItems] = useState<Liability[]>([])
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Liability | null>(null)
  const [form, setForm] = useState(blank)
  const [loading, setLoading] = useState(false)

  const CATEGORIES: { value: LiabilityCategory; label: string }[] = [
    { value: 'mortgage', label: t('category.mortgage') },
    { value: 'loan', label: t('category.loan') },
    { value: 'credit_card', label: t('category.credit_card') },
    { value: 'overdraft', label: t('category.overdraft') },
    { value: 'other', label: t('category.other') },
  ]

  const connectBank = async () => {
    const res = await fetch('/api/connections/auth')
    const { url } = await res.json()
    window.location.href = url
  }

  const load = useCallback(async () => {
    const res = await fetch('/api/liabilities')
    const { liabilities } = await res.json()
    setItems(liabilities || [])
  }, [])

  useEffect(() => { load() }, [load])

  const openAdd = () => { setEditing(null); setForm({ ...blank, currency: getDefaultCurrency() }); setOpen(true) }
  const openEdit = (l: Liability) => {
    setEditing(l)
    setForm({
      name: l.name, category: l.category, balance: String(l.balance), currency: l.currency,
      interest_rate: String(l.interest_rate || ''), monthly_payment: String(l.monthly_payment || ''),
      institution: l.institution || '',
      property_value: String((l as Liability & { property_value?: number }).property_value || ''),
      fixed_rate_end_date: String((l as Liability & { fixed_rate_end_date?: string }).fixed_rate_end_date || ''),
      mortgage_term_years: String((l as Liability & { mortgage_term_years?: number }).mortgage_term_years || ''),
    })
    setOpen(true)
  }

  const save = async () => {
    setLoading(true)
    const isMortgage = form.category === 'mortgage'
    const payload = {
      name: form.name, category: form.category, balance: parseFloat(form.balance) || 0,
      currency: form.currency, interest_rate: parseFloat(form.interest_rate) || null,
      monthly_payment: parseFloat(form.monthly_payment) || null, institution: form.institution,
      ...(isMortgage && {
        property_value: parseFloat(form.property_value) || null,
        fixed_rate_end_date: form.fixed_rate_end_date || null,
        mortgage_term_years: parseInt(form.mortgage_term_years) || null,
      }),
    }
    if (editing) {
      await fetch('/api/liabilities', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: editing.id, ...payload }) })
    } else {
      await fetch('/api/liabilities', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
    }
    setOpen(false); setLoading(false); load()
  }

  const del = async (id: string) => {
    if (!confirm(t('deleteConfirm'))) return
    await fetch('/api/liabilities', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) })
    load()
  }

  const total = items.reduce((s, l) => s + Number(l.balance), 0)

  return (
    <div>
      <Topbar title={t('title')} subtitle={`${items.length} items · ${formatCurrency(total)} total`} userName={session?.user?.name ?? ''}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={connectBank}><Landmark size={14} /> {t('connectBank')}</Button>
            <Button onClick={openAdd} size="sm"><Plus size={14} /> {tc('add')}</Button>
          </div>
        } />
      <div className="p-4 md:p-8 space-y-4 animate-fade-in">
        {items.length === 0 ? (
          <Card><CardContent className="py-16 text-center">
            <CreditCard size={32} className="text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 font-medium">{t('empty')}</p>
            <Button onClick={openAdd} size="sm" className="mt-4"><Plus size={14} /> {t('addLiability')}</Button>
          </CardContent></Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {items.map((l) => {
              const lWithExtra = l as Liability & { property_value?: number; fixed_rate_end_date?: string; mortgage_term_years?: number }
              const ltv = l.category === 'mortgage' ? calcLtv(Number(l.balance), lWithExtra.property_value ?? null) : null
              const remortgage = l.category === 'mortgage' ? remortgageAlert(lWithExtra.fixed_rate_end_date) : null
              return (
              <Card key={l.id} className={`hover:shadow-md transition-shadow ${remortgage?.urgent ? 'border-amber-300' : ''}`}>
                <CardContent className="pt-5">
                  {/* Remortgage alert */}
                  {remortgage && (
                    <div className={`flex items-center gap-2 text-xs mb-3 px-3 py-2 rounded-xl ${remortgage.urgent ? 'bg-amber-50 text-amber-800 border border-amber-200' : 'bg-blue-50 text-blue-700 border border-blue-100'}`}>
                      <AlertTriangle size={12} />
                      {remortgage.months <= 0
                        ? t('fixedRateExpired')
                        : `${t('fixedRateEndsIn')} ${remortgage.months} ${remortgage.months !== 1 ? t('months') : t('month')} ${t('startShopping')}`}
                    </div>
                  )}
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="font-semibold text-slate-800">{l.name}</p>
                      {l.institution && <p className="text-xs text-slate-400 mt-0.5">{l.institution}</p>}
                    </div>
                    <div className="flex items-center gap-1.5">
                      {l.ob_account_id && (
                        <Badge variant="info" className="flex items-center gap-1">
                          <RefreshCw size={9} /> {t('live')}
                        </Badge>
                      )}
                      <Badge variant="danger">{CATEGORIES.find(c => c.value === l.category)?.label}</Badge>
                    </div>
                  </div>
                  <p className="text-2xl font-bold text-rose-500">{formatCurrency(Number(l.balance), l.currency)}</p>
                  {l.ob_account_id && (
                    <p className="text-xs text-indigo-400 mt-0.5 flex items-center gap-1">
                      <RefreshCw size={9} /> {t('liveBalance')}
                    </p>
                  )}
                  {/* Mortgage-specific details */}
                  {l.category === 'mortgage' && (ltv !== null || lWithExtra.fixed_rate_end_date) && (
                    <div className="flex items-center gap-3 mt-1">
                      {ltv !== null && (
                        <div className="flex items-center gap-1">
                          <Home size={11} className="text-slate-400" />
                          <span className={`text-xs font-medium ${ltv > 90 ? 'text-rose-600' : ltv > 75 ? 'text-amber-600' : 'text-emerald-600'}`}>
                            {`${ltv}% ${t('ltvLabel')}`}
                          </span>
                        </div>
                      )}
                      {lWithExtra.fixed_rate_end_date && (
                        <span className="text-xs text-slate-400">{`${t('fixedUntil')} ${lWithExtra.fixed_rate_end_date}`}</span>
                      )}
                    </div>
                  )}
                  {l.interest_rate && <p className="text-xs text-slate-400 mt-0.5">{`${l.interest_rate}${t('interestSuffix')}`}</p>}
                  {l.monthly_payment && <p className="text-xs text-slate-400">{`${formatCurrency(Number(l.monthly_payment), l.currency)}${t('monthlySuffix')}`}</p>}
                  <p className="text-xs text-slate-400 mt-1">{`${t('added')} ${formatDate(l.created_at)}`}</p>
                  <div className="flex gap-2 mt-4">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openEdit(l)}
                      disabled={!!l.ob_account_id}
                      title={l.ob_account_id ? t('syncedFromBank') : undefined}
                    >
                      <Pencil size={13} /> {tc('edit')}
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => del(l.id)} className="text-red-400 hover:text-red-600 hover:bg-red-50"><Trash2 size={13} /></Button>
                  </div>
                </CardContent>
              </Card>
              )
            })}
          </div>
        )}
      </div>
      <Modal open={open} onClose={() => setOpen(false)} title={editing ? t('editModal') : t('addModal')}>
        <div className="space-y-4">
          <Input label={t('form.name')} placeholder={t('form.namePlaceholder')} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
          <Select label={t('form.category')} value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value as LiabilityCategory }))} options={CATEGORIES} />
          <div className="grid grid-cols-2 gap-3">
            <Input label={t('form.balance')} type="number" value={form.balance} onChange={e => setForm(f => ({ ...f, balance: e.target.value }))} />
            <Input label={t('form.interestRate')} type="number" value={form.interest_rate} onChange={e => setForm(f => ({ ...f, interest_rate: e.target.value }))} />
          </div>
          <Input label={t('form.monthlyPayment')} type="number" value={form.monthly_payment} onChange={e => setForm(f => ({ ...f, monthly_payment: e.target.value }))} />
          <Input label={t('form.institution')} placeholder={t('form.institutionPlaceholder')} value={form.institution} onChange={e => setForm(f => ({ ...f, institution: e.target.value }))} />

          {/* Mortgage-specific fields */}
          {form.category === 'mortgage' && (
            <div className="pt-2 border-t border-slate-100 space-y-3">
              <p className="text-xs font-semibold text-slate-500 flex items-center gap-1.5"><Home size={12} /> {t('form.mortgageDetails')}</p>
              <div className="grid grid-cols-2 gap-3">
                <Input label={t('form.propertyValue')} type="number" placeholder={t('form.propertyValuePlaceholder')} value={form.property_value} onChange={e => setForm(f => ({ ...f, property_value: e.target.value }))} />
                <Input label={t('form.termYears')} type="number" placeholder={t('form.termYearsPlaceholder')} value={form.mortgage_term_years} onChange={e => setForm(f => ({ ...f, mortgage_term_years: e.target.value }))} />
              </div>
              <Input label={t('form.fixedRateEndDate')} type="date" value={form.fixed_rate_end_date} onChange={e => setForm(f => ({ ...f, fixed_rate_end_date: e.target.value }))} />
              {form.property_value && form.balance && (
                <p className="text-xs text-indigo-600">
                  LTV: {(Math.round((parseFloat(form.balance) / parseFloat(form.property_value)) * 1000) / 10).toFixed(1)}%
                  {parseFloat(form.balance) / parseFloat(form.property_value) > 0.9 && ` — ${t('ltvHigh')}`}
                  {parseFloat(form.balance) / parseFloat(form.property_value) <= 0.6 && ` — ${t('ltvExcellent')}`}
                </p>
              )}
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <Button variant="secondary" onClick={() => setOpen(false)} className="flex-1">{tc('cancel')}</Button>
            <Button onClick={save} loading={loading} className="flex-1">{editing ? tc('save') : tc('add')}</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
