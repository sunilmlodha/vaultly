'use client'
import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Topbar } from '@/components/layout/topbar'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Modal } from '@/components/ui/modal'
import { formatCurrency } from '@/lib/utils'
import { Plus, Target, Pencil, Trash2 } from 'lucide-react'
import type { Goal } from '@/lib/types'

const CATEGORIES = [
  { value: 'savings', label: 'Savings' },
  { value: 'emergency_fund', label: 'Emergency Fund' },
  { value: 'holiday', label: 'Holiday' },
  { value: 'property', label: 'Property' },
  { value: 'retirement', label: 'Retirement' },
  { value: 'education', label: 'Education' },
  { value: 'other', label: 'Other' },
]

const blank = { name: '', category: 'savings', target_amount: '', current_amount: '', currency: 'GBP', target_date: '', notes: '' }

export default function GoalsPage() {
  const [goals, setGoals] = useState<Goal[]>([])
  const [profile, setProfile] = useState<{ id: string; household_id: string; full_name: string } | null>(null)
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Goal | null>(null)
  const [form, setForm] = useState(blank)
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  const load = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data: p } = await supabase.from('profiles').select('*').eq('id', user.id).single()
    setProfile(p)
    const { data } = await supabase.from('goals').select('*').eq('household_id', p.household_id).order('created_at', { ascending: false })
    setGoals(data || [])
  }, [supabase])

  useEffect(() => { load() }, [load])

  const openAdd = () => { setEditing(null); setForm(blank); setOpen(true) }
  const openEdit = (g: Goal) => { setEditing(g); setForm({ name: g.name, category: g.category, target_amount: String(g.target_amount), current_amount: String(g.current_amount), currency: g.currency, target_date: g.target_date || '', notes: g.notes || '' }); setOpen(true) }

  const save = async () => {
    if (!profile) return
    setLoading(true)
    const payload = { name: form.name, category: form.category, target_amount: parseFloat(form.target_amount) || 0, current_amount: parseFloat(form.current_amount) || 0, currency: form.currency, target_date: form.target_date || null, notes: form.notes, user_id: profile.id, household_id: profile.household_id }
    if (editing) await supabase.from('goals').update(payload).eq('id', editing.id)
    else await supabase.from('goals').insert(payload)
    setOpen(false); setLoading(false); load()
  }

  const del = async (id: string) => {
    if (!confirm('Delete goal?')) return
    await supabase.from('goals').delete().eq('id', id)
    load()
  }

  return (
    <div>
      <Topbar title="Goals" subtitle={`${goals.length} goals`} userName={profile?.full_name}
        actions={<Button onClick={openAdd} size="sm"><Plus size={14} /> Add Goal</Button>} />
      <div className="p-4 md:p-8 animate-fade-in">
        {goals.length === 0 ? (
          <Card><CardContent className="py-16 text-center">
            <Target size={32} className="text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 font-medium">No goals yet</p>
            <Button onClick={openAdd} size="sm" className="mt-4"><Plus size={14} /> Set a goal</Button>
          </CardContent></Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {goals.map((g) => {
              const pct = Math.min(100, Math.round((g.current_amount / g.target_amount) * 100))
              return (
                <Card key={g.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="pt-5">
                    <div className="flex items-start justify-between mb-1">
                      <p className="font-semibold text-slate-800">{g.name}</p>
                      <span className="text-xs font-bold text-indigo-500">{pct}%</span>
                    </div>
                    <p className="text-xs text-slate-400 mb-3">{CATEGORIES.find(c => c.value === g.category)?.label}{g.target_date ? ` · By ${g.target_date}` : ''}</p>
                    <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden mb-3">
                      <div className="h-full bg-indigo-400 rounded-full transition-all" style={{ width: `${pct}%` }} />
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="font-semibold text-slate-700">{formatCurrency(g.current_amount, g.currency)}</span>
                      <span className="text-slate-400">of {formatCurrency(g.target_amount, g.currency)}</span>
                    </div>
                    <div className="flex gap-2 mt-4">
                      <Button variant="ghost" size="sm" onClick={() => openEdit(g)}><Pencil size={13} /> Edit</Button>
                      <Button variant="ghost" size="sm" onClick={() => del(g.id)} className="text-red-400 hover:text-red-600 hover:bg-red-50"><Trash2 size={13} /></Button>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>
      <Modal open={open} onClose={() => setOpen(false)} title={editing ? 'Edit Goal' : 'New Goal'}>
        <div className="space-y-4">
          <Input label="Goal name" placeholder="e.g. Emergency Fund" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
          <Select label="Category" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} options={CATEGORIES} />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Target (£)" type="number" value={form.target_amount} onChange={e => setForm(f => ({ ...f, target_amount: e.target.value }))} />
            <Input label="Saved so far (£)" type="number" value={form.current_amount} onChange={e => setForm(f => ({ ...f, current_amount: e.target.value }))} />
          </div>
          <Input label="Target date (optional)" type="date" value={form.target_date} onChange={e => setForm(f => ({ ...f, target_date: e.target.value }))} />
          <div className="flex gap-3 pt-2">
            <Button variant="secondary" onClick={() => setOpen(false)} className="flex-1">Cancel</Button>
            <Button onClick={save} loading={loading} className="flex-1">{editing ? 'Save' : 'Create goal'}</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
