'use client'
import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Topbar } from '@/components/layout/topbar'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Modal } from '@/components/ui/modal'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { formatDate } from '@/lib/utils'
import { FileText, Plus, Trash2, Download } from 'lucide-react'
import type { Document } from '@/lib/types'

const CATEGORIES = [
  { value: 'pension_statement', label: 'Pension Statement' },
  { value: 'insurance_policy', label: 'Insurance Policy' },
  { value: 'will', label: 'Will / LPA' },
  { value: 'mortgage', label: 'Mortgage' },
  { value: 'tax', label: 'Tax' },
  { value: 'investment', label: 'Investment' },
  { value: 'other', label: 'Other' },
]

const blank = { name: '', category: 'other', notes: '' }

export default function DocumentsPage() {
  const [docs, setDocs] = useState<Document[]>([])
  const [profile, setProfile] = useState<{ id: string; household_id: string; full_name: string } | null>(null)
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState(blank)
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  const load = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data: p } = await supabase.from('profiles').select('*').eq('id', user.id).single()
    setProfile(p)
    const { data } = await supabase.from('documents').select('*').eq('household_id', p.household_id).order('created_at', { ascending: false })
    setDocs(data || [])
  }, [supabase])

  useEffect(() => { load() }, [load])

  const upload = async () => {
    if (!profile || !file) return
    setLoading(true)
    const path = `${profile.household_id}/${Date.now()}_${file.name}`
    const { data: uploadData } = await supabase.storage.from('documents').upload(path, file)
    if (!uploadData) { setLoading(false); return }
    const { data: { publicUrl } } = supabase.storage.from('documents').getPublicUrl(path)
    await supabase.from('documents').insert({ name: form.name || file.name, category: form.category, file_url: publicUrl, file_size: file.size, notes: form.notes, user_id: profile.id, household_id: profile.household_id })
    setOpen(false); setLoading(false); setFile(null); setForm(blank); load()
  }

  const del = async (id: string, fileUrl: string) => {
    if (!confirm('Delete document?')) return
    await supabase.from('documents').delete().eq('id', id)
    const path = fileUrl.split('/documents/')[1]
    if (path) await supabase.storage.from('documents').remove([path])
    load()
  }

  const fmt = (bytes: number) => bytes < 1024 ? `${bytes}B` : bytes < 1048576 ? `${(bytes / 1024).toFixed(0)}KB` : `${(bytes / 1048576).toFixed(1)}MB`

  return (
    <div>
      <Topbar title="Documents" subtitle={`${docs.length} stored`} userName={profile?.full_name}
        actions={<Button onClick={() => setOpen(true)} size="sm"><Plus size={14} /> Upload</Button>} />
      <div className="p-4 md:p-8 animate-fade-in">
        {docs.length === 0 ? (
          <Card><CardContent className="py-16 text-center">
            <FileText size={32} className="text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 font-medium">No documents yet</p>
            <p className="text-slate-400 text-sm mb-4">Store wills, pension statements, insurance policies</p>
            <Button onClick={() => setOpen(true)} size="sm"><Plus size={14} /> Upload first document</Button>
          </CardContent></Card>
        ) : (
          <div className="space-y-3">
            {docs.map((d) => (
              <Card key={d.id} className="hover:shadow-md transition-shadow">
                <CardContent className="py-4 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center shrink-0">
                      <FileText size={18} className="text-slate-500" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-slate-800 truncate">{d.name}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <Badge variant="default">{CATEGORIES.find(c => c.value === d.category)?.label || d.category}</Badge>
                        <span className="text-xs text-slate-400">{fmt(d.file_size)} · {formatDate(d.created_at)}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <a href={d.file_url} target="_blank" rel="noopener noreferrer">
                      <Button variant="ghost" size="sm"><Download size={14} /></Button>
                    </a>
                    <Button variant="ghost" size="sm" onClick={() => del(d.id, d.file_url)} className="text-red-400 hover:text-red-600 hover:bg-red-50"><Trash2 size={13} /></Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
      <Modal open={open} onClose={() => setOpen(false)} title="Upload Document">
        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-slate-700">File</label>
            <input type="file" onChange={e => setFile(e.target.files?.[0] || null)} accept=".pdf,.doc,.docx,.jpg,.png"
              className="w-full text-sm text-slate-500 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:bg-indigo-50 file:text-indigo-600 file:font-medium hover:file:bg-indigo-100 transition-all" />
          </div>
          <Input label="Document name (optional)" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Leave blank to use filename" />
          <Select label="Category" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} options={CATEGORIES} />
          <div className="flex gap-3 pt-2">
            <Button variant="secondary" onClick={() => setOpen(false)} className="flex-1">Cancel</Button>
            <Button onClick={upload} loading={loading} disabled={!file} className="flex-1">Upload</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
