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
import { Plus, Pencil, Trash2, Wallet } from 'lucide-react'
import type { Asset, AssetCategory } from '@/lib/types'

const CATEGORIES: { value: AssetCategory; label: string }[] = [
  { value: 'bank_account', label: 'Bank Account' },
  { value: 'investment', label: 'Investment' },
  { value: 'pension', label: 'Pension' },
  { value: 'property', label: 'Property' },
  { value: 'crypto', label: 'Crypto' },
  { value: 'insurance', label: 'Insurance' },
  { value: 'other', label: 'Other' },
]

const BADGE: Record<AssetCategory, 'purple' | 'success' | 'info' | 'warning' | 'danger' | 'default'> = {
  bank_account: 'info', investment: 'success', pension: 'purple',
  property: 'warning', crypto: 'danger', insurance: 'default', other: 'default',
}

const blank = { name: '', category: 'bank_account' as AssetCategory, value: '', currency: 'GBP', institution: '', notes: '' }

export default function AssetsPage() {
  const { data: session } = useSession()
  const [assets, setAssets] = useState<Asset[]>([])
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Asset | null>(null)
  const [form, setForm] = useState(blank)
  const [loading, setLoading] = useState(false)

  const load = useCallback(async () => {
    const res = await fetch('/api/assets')
    const { assets: data } = await res.json()
    setAssets(data || [])
  }, [])

  useEffect(() => { load() }, [load])

  const openAdd = () => { setEditing(null); setForm(blank); setOpen(true) }
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
    if (!confirm('Delete this asset?')) return
    await fetch('/api/assets', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) })
    load()
  }

  const total = assets.reduce((s, a) => s + Number(a.value), 0)

  return (
    <div>
      <Topbar title="Assets" subtitle={`${assets.length} assets · ${formatCurrency(total)}`} userName={session?.user?.name ?? ''}
        actions={<Button onClick={openAdd} size="sm"><Plus size={14} /> Add Asset</Button>} />
      <div className="p-4 md:p-8 space-y-4 animate-fade-in">
        {assets.length === 0 ? (
          <Card><CardContent className="py-16 text-center">
            <Wallet size={32} className="text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 font-medium">No assets yet</p>
            <p className="text-slate-400 text-sm mb-4">Add your bank accounts, pensions, investments and more</p>
            <Button onClick={openAdd} size="sm"><Plus size={14} /> Add first asset</Button>
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
                    <Badge variant={BADGE[a.category]}>{CATEGORIES.find(c => c.value === a.category)?.label}</Badge>
                  </div>
                  <p className="text-2xl font-bold text-indigo-600">{formatCurrency(Number(a.value), a.currency)}</p>
                  <p className="text-xs text-slate-400 mt-1">Added {formatDate(a.created_at)}</p>
                  <div className="flex gap-2 mt-4">
                    <Button variant="ghost" size="sm" onClick={() => openEdit(a)}><Pencil size={13} /> Edit</Button>
                    <Button variant="ghost" size="sm" onClick={() => del(a.id)} className="text-red-400 hover:text-red-600 hover:bg-red-50"><Trash2 size={13} /></Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
      <Modal open={open} onClose={() => setOpen(false)} title={editing ? 'Edit Asset' : 'Add Asset'}>
        <div className="space-y-4">
          <Input label="Name" placeholder="e.g. Halifax Current Account" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
          <Select label="Category" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value as AssetCategory }))} options={CATEGORIES} />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Value (£)" type="number" placeholder="0" value={form.value} onChange={e => setForm(f => ({ ...f, value: e.target.value }))} />
            <Input label="Currency" placeholder="GBP" value={form.currency} onChange={e => setForm(f => ({ ...f, currency: e.target.value }))} />
          </div>
          <Input label="Institution (optional)" placeholder="e.g. Barclays" value={form.institution} onChange={e => setForm(f => ({ ...f, institution: e.target.value }))} />
          <div className="flex gap-3 pt-2">
            <Button variant="secondary" onClick={() => setOpen(false)} className="flex-1">Cancel</Button>
            <Button onClick={save} loading={loading} className="flex-1">{editing ? 'Save changes' : 'Add asset'}</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
