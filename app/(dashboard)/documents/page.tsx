'use client'
import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { Topbar } from '@/components/layout/topbar'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Modal } from '@/components/ui/modal'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { formatDate } from '@/lib/utils'
import { FileText, Plus, Trash2, Download } from 'lucide-react'

interface Doc { id: string; name: string; category: string; blob_url: string; file_size: number; created_at: string }

const CATEGORIES = [
  { value: 'pension_statement', label: 'Pension Statement' },
  { value: 'insurance_policy', label: 'Insurance Policy' },
  { value: 'will', label: 'Will / LPA' },
  { value: 'mortgage', label: 'Mortgage' },
  { value: 'tax', label: 'Tax' },
  { value: 'investment', label: 'Investment' },
  { value: 'other', label: 'Other' },
]

const blank = { name: '', category: 'other' }

export default function DocumentsPage() {
  const { data: session } = useSession()
  const [docs, setDocs] = useState<Doc[]>([])
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState(blank)
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    const res = await fetch('/api/documents')
    const { documents } = await res.json()
    setDocs(documents || [])
  }, [])

  useEffect(() => { load() }, [load])

  const fmt = (bytes: number) => bytes < 1024 ? `${bytes}B` : bytes < 1048576 ? `${(bytes / 1024).toFixed(0)}KB` : `${(bytes / 1048576).toFixed(1)}MB`
  const MAX_SIZE = 4 * 1024 * 1024 // 4MB — stay under Vercel's 4.5MB serverless limit

  const upload = async () => {
    if (!file) return
    if (file.size > MAX_SIZE) {
      setError(`File is too large (${fmt(file.size)}). Maximum size is 4MB.`)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('name', form.name || file.name)
      fd.append('category', form.category)
      const res = await fetch('/api/documents', { method: 'POST', body: fd })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body?.error || `Upload failed (${res.status})`)
      }
      setOpen(false); setFile(null); setForm(blank); load()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Upload failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const del = async (id: string) => {
    if (!confirm('Delete document?')) return
    await fetch('/api/documents', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) })
    load()
  }

  return (
    <div>
      <Topbar title="Documents" subtitle={`${docs.length} stored · Vercel Blob`} userName={session?.user?.name ?? ''}
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
            {docs.map(d => (
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
                    <a href={d.blob_url} target="_blank" rel="noopener noreferrer">
                      <Button variant="ghost" size="sm"><Download size={14} /></Button>
                    </a>
                    <Button variant="ghost" size="sm" onClick={() => del(d.id)} className="text-red-400 hover:text-red-600 hover:bg-red-50"><Trash2 size={13} /></Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
      <Modal open={open} onClose={() => { setOpen(false); setError(null) }} title="Upload Document">
        <div className="space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-slate-700">File <span className="text-slate-400 font-normal">(max 4MB)</span></label>
            <input type="file" onChange={e => { setFile(e.target.files?.[0] || null); setError(null) }} accept=".pdf,.doc,.docx,.jpg,.png"
              className="w-full text-sm text-slate-500 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:bg-indigo-50 file:text-indigo-600 file:font-medium hover:file:bg-indigo-100 transition-all" />
          </div>
          <Input label="Document name (optional)" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Leave blank to use filename" />
          <Select label="Category" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} options={CATEGORIES} />
          <div className="flex gap-3 pt-2">
            <Button variant="secondary" onClick={() => { setOpen(false); setError(null) }} className="flex-1">Cancel</Button>
            <Button onClick={upload} loading={loading} disabled={!file} className="flex-1">Upload to Vault</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
