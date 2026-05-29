'use client'
import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useTranslations } from 'next-intl'
import { Topbar } from '@/components/layout/topbar'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Modal } from '@/components/ui/modal'
import { formatCurrency } from '@/lib/utils'
import { Plus, Target, Pencil, Trash2, Sparkles, TrendingUp, TrendingDown } from 'lucide-react'
import type { Goal } from '@/lib/types'

interface CoachState {
  goalId: string
  loading: boolean
  tip: string | null
  on_track: boolean | null
  required_monthly: number | null
  monthly_surplus: number | null
}

const blank = { name: '', category: 'savings', target_amount: '', current_amount: '', currency: 'GBP', target_date: '' }

function getDefaultCurrency() {
  if (typeof window === 'undefined') return 'GBP'
  return localStorage.getItem('vaultly_currency') || 'GBP'
}

export default function GoalsPage() {
  const { data: session } = useSession()
  const t = useTranslations('goals')
  const tc = useTranslations('common')
  const [goals, setGoals] = useState<Goal[]>([])
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Goal | null>(null)
  const [form, setForm] = useState(blank)
  const [loading, setLoading] = useState(false)
  const [coach, setCoach] = useState<CoachState | null>(null)

  const CATEGORIES = [
    { value: 'savings', label: t('category.savings') },
    { value: 'emergency_fund', label: t('category.emergency_fund') },
    { value: 'holiday', label: t('category.holiday') },
    { value: 'property', label: t('category.property') },
    { value: 'retirement', label: t('category.retirement') },
    { value: 'education', label: t('category.education') },
    { value: 'other', label: t('category.other') },
  ]

  const fetchCoach = async (goalId: string) => {
    if (coach?.goalId === goalId && coach.tip) return // already loaded
    setCoach({ goalId, loading: true, tip: null, on_track: null, required_monthly: null, monthly_surplus: null })
    try {
      const res = await fetch(`/api/goals/coach?goalId=${goalId}`)
      const data = await res.json()
      setCoach({ goalId, loading: false, tip: data.tip, on_track: data.on_track, required_monthly: data.required_monthly, monthly_surplus: data.monthly_surplus })
    } catch {
      setCoach(c => c ? { ...c, loading: false, tip: t('coachErrorMessage') } : null)
    }
  }

  const load = useCallback(async () => {
    const res = await fetch('/api/goals')
    const { goals: data } = await res.json()
    setGoals(data || [])
  }, [])

  useEffect(() => { load() }, [load])

  const openAdd = () => { setEditing(null); setForm({ ...blank, currency: getDefaultCurrency() }); setOpen(true) }
  const openEdit = (g: Goal) => {
    setEditing(g)
    setForm({ name: g.name, category: g.category, target_amount: String(g.target_amount), current_amount: String(g.current_amount), currency: g.currency, target_date: g.target_date || '' })
    setOpen(true)
  }

  const save = async () => {
    setLoading(true)
    const payload = { name: form.name, category: form.category, target_amount: parseFloat(form.target_amount) || 0, current_amount: parseFloat(form.current_amount) || 0, currency: form.currency, target_date: form.target_date || null }
    if (editing) {
      await fetch('/api/goals', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: editing.id, ...payload }) })
    } else {
      await fetch('/api/goals', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
    }
    setOpen(false); setLoading(false); load()
  }

  const del = async (id: string) => {
    if (!confirm(t('deleteConfirm'))) return
    await fetch('/api/goals', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) })
    load()
  }

  return (
    <div>
      <Topbar title={t('title')} subtitle={`${goals.length} ${t('subtitle')}`} userName={session?.user?.name ?? ''}
        actions={<Button onClick={openAdd} size="sm"><Plus size={14} /> {t('addGoal')}</Button>} />
      <div className="p-4 md:p-8 animate-fade-in">
        {goals.length === 0 ? (
          <Card><CardContent className="py-16 text-center">
            <Target size={32} className="text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 font-medium">{t('empty')}</p>
            <Button onClick={openAdd} size="sm" className="mt-4"><Plus size={14} /> {t('setGoal')}</Button>
          </CardContent></Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {goals.map((g) => {
              const pct = Math.min(100, Math.round((Number(g.current_amount) / Number(g.target_amount)) * 100))
              return (
                <Card key={g.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="pt-5">
                    <div className="flex items-start justify-between mb-1">
                      <p className="font-semibold text-slate-800">{g.name}</p>
                      <span className="text-xs font-bold text-indigo-500">{pct}%</span>
                    </div>
                    <p className="text-xs text-slate-400 mb-3">{CATEGORIES.find(c => c.value === g.category)?.label}{g.target_date ? ` · ${t('by')} ${g.target_date}` : ''}</p>
                    <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden mb-3">
                      <div className="h-full bg-indigo-400 rounded-full transition-all" style={{ width: `${pct}%` }} />
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="font-semibold text-slate-700">{formatCurrency(Number(g.current_amount), g.currency)}</span>
                      <span className="text-slate-400">{` ${t('of')} `}{formatCurrency(Number(g.target_amount), g.currency)}</span>
                    </div>
                    <div className="flex gap-2 mt-4">
                      <Button variant="ghost" size="sm" onClick={() => openEdit(g)}><Pencil size={13} /> {tc('edit')}</Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => coach?.goalId === g.id && coach.tip ? setCoach(null) : fetchCoach(g.id)}
                        className="text-indigo-500 hover:text-indigo-700 hover:bg-indigo-50"
                      >
                        <Sparkles size={13} /> {t('coach')}
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => del(g.id)} className="text-red-400 hover:text-red-600 hover:bg-red-50"><Trash2 size={13} /></Button>
                    </div>

                    {/* ── Goal Coach Panel ──────────────────────────────── */}
                    {coach?.goalId === g.id && (
                      <div className="mt-3 border-t border-slate-100 pt-3">
                        {coach.loading ? (
                          <div className="flex items-center gap-2 text-xs text-indigo-600">
                            <div className="w-3 h-3 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
                            {t('coachLoading')}
                          </div>
                        ) : (
                          <div className="bg-indigo-50 rounded-xl p-3 border border-indigo-100">
                            <div className="flex items-start gap-2">
                              <div className="w-5 h-5 rounded-lg bg-indigo-200 flex items-center justify-center shrink-0 mt-0.5">
                                {coach.on_track ? <TrendingUp size={11} className="text-indigo-700" /> : <TrendingDown size={11} className="text-indigo-700" />}
                              </div>
                              <div>
                                <p className="text-xs font-semibold text-indigo-700 mb-1">
                                  {coach.on_track === null ? t('coachTitle') : coach.on_track ? `✓ ${t('coachOnTrack')}` : t('coachNeedsAttention')}
                                </p>
                                <p className="text-xs text-indigo-800 leading-relaxed">{coach.tip}</p>
                                {coach.required_monthly !== null && (
                                  <p className="text-xs text-indigo-500 mt-1">
                                    {`${t('needToSave')}: £${coach.required_monthly.toFixed(0)}/mo`}
                                    {coach.monthly_surplus !== null && ` · ${t('currentSurplus')}: £${coach.monthly_surplus.toFixed(0)}/mo`}
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>
      <Modal open={open} onClose={() => setOpen(false)} title={editing ? t('editModal') : t('addModal')}>
        <div className="space-y-4">
          <Input label={t('form.goalName')} placeholder={t('form.goalNamePlaceholder')} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
          <Select label={t('form.category')} value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} options={CATEGORIES} />
          <div className="grid grid-cols-2 gap-3">
            <Input label={t('form.target')} type="number" value={form.target_amount} onChange={e => setForm(f => ({ ...f, target_amount: e.target.value }))} />
            <Input label={t('form.savedSoFar')} type="number" value={form.current_amount} onChange={e => setForm(f => ({ ...f, current_amount: e.target.value }))} />
          </div>
          <Input label={t('form.targetDate')} type="date" value={form.target_date} onChange={e => setForm(f => ({ ...f, target_date: e.target.value }))} />
          <div className="flex gap-3 pt-2">
            <Button variant="secondary" onClick={() => setOpen(false)} className="flex-1">{tc('cancel')}</Button>
            <Button onClick={save} loading={loading} className="flex-1">{editing ? tc('save') : t('addGoal')}</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
