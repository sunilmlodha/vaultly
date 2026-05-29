'use client'
import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { Topbar } from '@/components/layout/topbar'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Modal } from '@/components/ui/modal'
import { formatCurrency, formatDate } from '@/lib/utils'
import { Plus, Pencil, Trash2, CreditCard } from 'lucide-react'
import type { Liability, LiabilityCategory } from '@/lib/types'

const CATEGORIES: { value: LiabilityCategory; label: string }[] = [
  { value: 'mortgage', label: 'Mortgage' },
  { value: 'loan', label: 'Loan' },
  { value: 'credit_card', label: 'Credit Card' },
  { value: 'overdraft', label: 'Overdraft' },
  { value: 'other', label: 'Other' },
]

const blank = { name: '', category: 'loan' as LiabilityCategory, balance: '', currency: 'GBP', interest_rate: '', monthly_payment: '', institution: '' }

export default function LiabilitiesPage() {
  const { data: session } = useSession()
  const [items, setItems] = useState<Liability[]>([])
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Liability | null>(null)
  const [form, setForm] = useState(blank)
  const [loading, setLoading] = useState(false)

  const load = useCallback(async () => {
    const res = await fetch('/api/liabilities')
    const { liabilities } = await res.json()
    setItems(liabilities || [])
  }, [])

  useEffect(() => { load() }, [load])

  const openAdd = () => { setEditing(null); setForm(blank); setOpen(true) }
  const openEdit = (l: Liability) => {
    setEditing(l)
    setForm({ name: l.name, category: l.category, balance: String(l.balance), currency: l.currency, interest_rate: String(l.interest_rate || ''), monthly_payment: String(l.monthly_payment || ''), institution: l.institution || '' })
    setOpen(true)
  }

  const save = async () => {
    setLoading(true)
    const payload = { name: form.name, category: form.category, balance: parseFloat(form.balance) || 0, currency: form.currency, interest_rate: parseFloat(form.interest_rate) || null, monthly_payment: parseFloat(form.monthly_payment) || null, institution: form.institution }
    if (editing) {
      await fetch('/api/liabilities', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: editing.id, ...payload }) })
    } else {
      await fetch('/api/liabilities', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
    }
    setOpen(false); setLoading(false); load()
  }

  const del = async (id: string) => {
    if (!confirm('Delete this liability?')) return
    await fetch('/api/liabilities', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) })
    load()
  }

  const total = items.reduce((s, l) => s + Number(l.balance), 0)

  return (
    <div>
      <Topbar title="Liabilities" subtitle={`${items.length} items · ${formatCurrency(total)} total`} userName={session?.user?.name ?? ''}
        actions={<Button onClick={openAdd} size="sm"><Plus size={14} /> Add</Button>} />
      <div className="p-4 md:p-8 space-y-4 animate-fade-in">
        {items.length === 0 ? (
          <Card><CardContent className="py-16 text-center">
            <CreditCard size={32} className="text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 font-medium">No liabilities tracked</p>
            <Button onClick={openAdd} size="sm" className="mt-4"><Plus size={14} /> Add liability</Button>
          </CardContent></Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {items.map((l) => (
              <Card key={l.id} className="hover:shadow-md transition-shadow">
                <CardContent className="pt-5">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="font-semibold text-slate-800">{l.name}</p>
                      {l.institution && <p className="text-xs text-slate-400 mt-0.5">{l.institution}</p>}
                    </div>
                    <Badge variant="danger">{CATEGORIES.find(c => c.value === l.category)?.label}</Badge>
                  </div>
                  <p className="text-2xl font-bold text-rose-500">{formatCurrency(Number(l.balance), l.currency)}</p>
                  {l.interest_rate && <p className="text-xs text-slate-400 mt-0.5">{l.interest_rate}% interest</p>}
                  {l.monthly_payment && <p className="text-xs text-slate-400">{formatCurrency(Number(l.monthly_payment), l.currency)}/mo</p>}
                  <p className="text-xs text-slate-400 mt-1">Added {formatDate(l.created_at)}</p>
                  <div className="flex gap-2 mt-4">
                    <Button variant="ghost" size="sm" onClick={() => openEdit(l)}><Pencil size={13} /> Edit</Button>
                    <Button variant="ghost" size="sm" onClick={() => del(l.id)} className="text-red-400 hover:text-red-600 hover:bg-red-50"><Trash2 size={13} /></Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
      <Modal open={open} onClose={() => setOpen(false)} title={editing ? 'Edit Liability' : 'Add Liability'}>
        <div className="space-y-4">
          <Input label="Name" placeholder="e.g. HSBC Mortgage" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
          <Select label="Category" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value as LiabilityCategory }))} options={CATEGORIES} />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Balance (£)" type="number" value={form.balance} onChange={e => setForm(f => ({ ...f, balance: e.target.value }))} />
            <Input label="Interest rate %" type="number" value={form.interest_rate} onChange={e => setForm(f => ({ ...f, interest_rate: e.target.value }))} />
          </div>
          <Input label="Monthly payment (£)" type="number" value={form.monthly_payment} onChange={e => setForm(f => ({ ...f, monthly_payment: e.target.value }))} />
          <Input label="Institution" placeholder="e.g. HSBC" value={form.institution} onChange={e => setForm(f => ({ ...f, institution: e.target.value }))} />
          <div className="flex gap-3 pt-2">
            <Button variant="secondary" onClick={() => setOpen(false)} className="flex-1">Cancel</Button>
            <Button onClick={save} loading={loading} className="flex-1">{editing ? 'Save' : 'Add'}</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
