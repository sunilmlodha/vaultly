'use client'
import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Topbar } from '@/components/layout/topbar'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Modal } from '@/components/ui/modal'
import { formatCurrency, formatDate, getDaysUntil } from '@/lib/utils'
import { Plus, RefreshCw, Trash2, Pencil } from 'lucide-react'
import type { Renewal } from '@/lib/types'

const CATEGORIES = [
  { value: 'subscription', label: 'Subscription' },
  { value: 'insurance', label: 'Insurance' },
  { value: 'utility', label: 'Utility' },
  { value: 'broadband', label: 'Broadband' },
  { value: 'mobile', label: 'Mobile' },
  { value: 'other', label: 'Other' },
]

const blank = { name: '', category: 'subscription', amount: '', currency: 'GBP', renewal_date: '', provider: '', auto_renews: 'true' }

export default function RenewalsPage() {
  const [items, setItems] = useState<Renewal[]>([])
  const [profile, setProfile] = useState<{ id: string; household_id: string; full_name: string } | null>(null)
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Renewal | null>(null)
  const [form, setForm] = useState(blank)
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  const load = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data: p } = await supabase.from('profiles').select('*').eq('id', user.id).single()
    setProfile(p)
    const { data } = await supabase.from('renewals').select('*').eq('household_id', p.household_id).order('renewal_date')
    setItems(data || [])
  }, [supabase])

  useEffect(() => { load() }, [load])

  const openAdd = () => { setEditing(null); setForm(blank); setOpen(true) }
  const openEdit = (r: Renewal) => { setEditing(r); setForm({ name: r.name, category: r.category, amount: String(r.amount), currency: r.currency, renewal_date: r.renewal_date, provider: r.provider || '', auto_renews: String(r.auto_renews) }); setOpen(true) }

  const save = async () => {
    if (!profile) return
    setLoading(true)
    const payload = { name: form.name, category: form.category, amount: parseFloat(form.amount) || 0, currency: form.currency, renewal_date: form.renewal_date, provider: form.provider, auto_renews: form.auto_renews === 'true', user_id: profile.id, household_id: profile.household_id }
    if (editing) await supabase.from('renewals').update(payload).eq('id', editing.id)
    else await supabase.from('renewals').insert(payload)
    setOpen(false); setLoading(false); load()
  }

  const del = async (id: string) => {
    if (!confirm('Delete renewal?')) return
    await supabase.from('renewals').delete().eq('id', id)
    load()
  }

  const getDaysVariant = (days: number) => days <= 7 ? 'danger' : days <= 14 ? 'warning' : days <= 30 ? 'info' : 'default'

  return (
    <div>
      <Topbar title="Renewals" subtitle={`${items.length} tracked`} userName={profile?.full_name}
        actions={<Button onClick={openAdd} size="sm"><Plus size={14} /> Add</Button>} />
      <div className="p-4 md:p-8 animate-fade-in">
        {items.length === 0 ? (
          <Card><CardContent className="py-16 text-center">
            <RefreshCw size={32} className="text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 font-medium">No renewals tracked</p>
            <Button onClick={openAdd} size="sm" className="mt-4"><Plus size={14} /> Add renewal</Button>
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
                        {r.auto_renews && <Badge variant="info">Auto-renews</Badge>}
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">{r.provider && `${r.provider} · `}Due {formatDate(r.renewal_date)}</p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <div className="text-right">
                        <p className="font-bold text-slate-800">{formatCurrency(r.amount, r.currency)}</p>
                        <Badge variant={getDaysVariant(days) as 'danger' | 'warning' | 'info' | 'default'}>
                          {days < 0 ? 'Overdue' : days === 0 ? 'Today' : `${days}d`}
                        </Badge>
                      </div>
                      <div className="flex gap-1">
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
      <Modal open={open} onClose={() => setOpen(false)} title={editing ? 'Edit Renewal' : 'Add Renewal'}>
        <div className="space-y-4">
          <Input label="Name" placeholder="e.g. Netflix" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
          <Select label="Category" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} options={CATEGORIES} />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Amount (£)" type="number" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} />
            <Input label="Renewal date" type="date" value={form.renewal_date} onChange={e => setForm(f => ({ ...f, renewal_date: e.target.value }))} />
          </div>
          <Input label="Provider (optional)" value={form.provider} onChange={e => setForm(f => ({ ...f, provider: e.target.value }))} />
          <Select label="Auto-renews?" value={form.auto_renews} onChange={e => setForm(f => ({ ...f, auto_renews: e.target.value }))} options={[{ value: 'true', label: 'Yes' }, { value: 'false', label: 'No' }]} />
          <div className="flex gap-3 pt-2">
            <Button variant="secondary" onClick={() => setOpen(false)} className="flex-1">Cancel</Button>
            <Button onClick={save} loading={loading} className="flex-1">{editing ? 'Save' : 'Add'}</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
