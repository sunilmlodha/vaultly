'use client'
import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useTranslations } from 'next-intl'
import { Topbar } from '@/components/layout/topbar'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Modal } from '@/components/ui/modal'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { formatDate } from '@/lib/utils'
import { FileText, Plus, Trash2, Download, Sparkles, X, ChevronDown, ChevronUp, Calendar, PoundSterling, Hash } from 'lucide-react'
import type { DocumentAnalysis } from '@/app/api/documents/[id]/analyse/route'

interface Doc { id: string; name: string; category: string; blob_url: string; file_size: number; created_at: string; notes?: string }

interface AnalysisState {
  docId: string
  loading: boolean
  result: DocumentAnalysis | null
  error: string | null
}

const blank = { name: '', category: 'other' }

export default function DocumentsPage() {
  const { data: session } = useSession()
  const tc = useTranslations('common')
  const t = useTranslations('documents')
  const [docs, setDocs] = useState<Doc[]>([])
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState(blank)
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [analysis, setAnalysis] = useState<AnalysisState | null>(null)
  const [expandedAnalysis, setExpandedAnalysis] = useState<string | null>(null)

  const CATEGORIES = [
    { value: 'pension_statement', label: t('category.pension_statement') },
    { value: 'insurance_policy', label: t('category.insurance_policy') },
    { value: 'will', label: t('category.will') },
    { value: 'mortgage', label: t('category.mortgage') },
    { value: 'tax', label: t('category.tax') },
    { value: 'investment', label: t('category.investment') },
    { value: 'other', label: t('category.other') },
  ]

  const analyseDoc = async (docId: string) => {
    setAnalysis({ docId, loading: true, result: null, error: null })
    setExpandedAnalysis(docId)
    try {
      const res = await fetch(`/api/documents/${docId}/analyse`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || t('errors.analysisFailed'))
      setAnalysis({ docId, loading: false, result: data.analysis, error: null })
    } catch (e: unknown) {
      setAnalysis({ docId, loading: false, result: null, error: e instanceof Error ? e.message : t('errors.analysisFailed') })
    }
  }

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
      setError(t('errors.fileTooLarge'))
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
      setError(e instanceof Error ? e.message : t('errors.uploadFailed'))
    } finally {
      setLoading(false)
    }
  }

  const del = async (id: string) => {
    if (!confirm(t('deleteConfirm'))) return
    await fetch('/api/documents', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) })
    load()
  }

  return (
    <div>
      <Topbar title={t('title')} subtitle={`${docs.length} ${t('subtitleStorage')}`} userName={session?.user?.name ?? ''}
        actions={<Button onClick={() => setOpen(true)} size="sm"><Plus size={14} /> {t('upload')}</Button>} />
      <div className="p-4 md:p-8 animate-fade-in">
        {docs.length === 0 ? (
          <Card><CardContent className="py-16 text-center">
            <FileText size={32} className="text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 font-medium">{t('empty')}</p>
            <p className="text-slate-400 text-sm mb-4">{t('emptyDesc')}</p>
            <Button onClick={() => setOpen(true)} size="sm"><Plus size={14} /> {t('uploadFirstDocument')}</Button>
          </CardContent></Card>
        ) : (
          <div className="space-y-3">
            {docs.map(d => {
              const isAnalysing = analysis?.docId === d.id && analysis.loading
              const docAnalysis = analysis?.docId === d.id ? analysis : null
              const isExpanded = expandedAnalysis === d.id
              return (
              <Card key={d.id} className="hover:shadow-md transition-shadow">
                <CardContent className="py-4">
                  <div className="flex items-center justify-between gap-4">
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
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => isExpanded && docAnalysis?.result ? setExpandedAnalysis(null) : analyseDoc(d.id)}
                        className="text-indigo-500 hover:text-indigo-700 hover:bg-indigo-50"
                        title={t('analyseWithAI')}
                      >
                        <Sparkles size={14} /> {isAnalysing ? t('analysing') : t('ai')}
                        {docAnalysis?.result && (isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />)}
                      </Button>
                      <a href={`/api/documents/${d.id}/download`} target="_blank" rel="noopener noreferrer">
                        <Button variant="ghost" size="sm"><Download size={14} /></Button>
                      </a>
                      <Button variant="ghost" size="sm" onClick={() => del(d.id)} className="text-red-400 hover:text-red-600 hover:bg-red-50"><Trash2 size={13} /></Button>
                    </div>
                  </div>

                  {/* ── AI Analysis Panel ─────────────────────────────────── */}
                  {isExpanded && docAnalysis && (
                    <div className="mt-4 border-t border-slate-100 pt-4">
                      {docAnalysis.loading && (
                        <div className="flex items-center gap-2 text-sm text-indigo-600">
                          <div className="w-4 h-4 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
                          {t('analysingWithAI')}
                        </div>
                      )}
                      {docAnalysis.error && (
                        <div className="flex items-center gap-2 text-sm text-rose-600 bg-rose-50 rounded-xl px-3 py-2">
                          <X size={14} />{docAnalysis.error}
                        </div>
                      )}
                      {docAnalysis.result && (
                        <div className="space-y-3">
                          <div className="flex items-start gap-2">
                            <div className="w-6 h-6 rounded-lg bg-indigo-100 flex items-center justify-center shrink-0 mt-0.5">
                              <Sparkles size={12} className="text-indigo-500" />
                            </div>
                            <div>
                              <p className="text-xs font-semibold text-indigo-600 mb-0.5">{docAnalysis.result.document_type}</p>
                              <p className="text-sm text-slate-700 leading-relaxed">{docAnalysis.result.summary}</p>
                            </div>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {docAnalysis.result.key_dates?.length > 0 && (
                              <div className="bg-slate-50 rounded-xl p-3">
                                <p className="text-xs font-semibold text-slate-500 mb-2 flex items-center gap-1.5"><Calendar size={11} /> {t('keyDates')}</p>
                                <div className="space-y-1">
                                  {docAnalysis.result.key_dates.map((kd, i) => (
                                    <div key={i} className="flex justify-between text-xs">
                                      <span className="text-slate-600">{kd.label}</span>
                                      <span className="font-medium text-slate-800">{kd.date}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                            {docAnalysis.result.key_amounts?.length > 0 && (
                              <div className="bg-slate-50 rounded-xl p-3">
                                <p className="text-xs font-semibold text-slate-500 mb-2 flex items-center gap-1.5"><PoundSterling size={11} /> {t('keyAmounts')}</p>
                                <div className="space-y-1">
                                  {docAnalysis.result.key_amounts.map((ka, i) => (
                                    <div key={i} className="flex justify-between text-xs">
                                      <span className="text-slate-600">{ka.label}</span>
                                      <span className="font-medium text-slate-800">{ka.currency || '£'}{ka.amount}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                          {docAnalysis.result.policy_number && (
                            <div className="flex items-center gap-2 text-xs text-slate-500">
                              <Hash size={11} /> {t('policyReference') + ': '}<span className="font-mono text-slate-700">{docAnalysis.result.policy_number}</span>
                            </div>
                          )}
                          {docAnalysis.result.action_items?.length > 0 && (
                            <div className="bg-amber-50 rounded-xl p-3 border border-amber-100">
                              <p className="text-xs font-semibold text-amber-700 mb-1.5">{t('actionItems')}</p>
                              <ul className="space-y-1">
                                {docAnalysis.result.action_items.map((item, i) => (
                                  <li key={i} className="text-xs text-amber-800 flex items-start gap-1.5">
                                    <span className="text-amber-400 mt-0.5">•</span>{item}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                          {docAnalysis.result.renewal_suggestion && (
                            <div className="bg-indigo-50 rounded-xl p-3 border border-indigo-100">
                              <p className="text-xs font-semibold text-indigo-600 mb-1">{t('suggestedRenewal')}</p>
                              <p className="text-xs text-indigo-700">{docAnalysis.result.renewal_suggestion.name} — {t('renewalDue') + ' '}{docAnalysis.result.renewal_suggestion.renewal_date}</p>
                              <a href="/renewals">
                                <button className="mt-2 text-xs font-medium text-indigo-600 hover:text-indigo-700 underline">{t('addToRenewals')}</button>
                              </a>
                            </div>
                          )}
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
      <Modal open={open} onClose={() => { setOpen(false); setError(null) }} title={t('uploadModal')}>
        <div className="space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-slate-700">{t('form.file')} <span className="text-slate-400 font-normal">{t('form.fileMaxSize')}</span></label>
            <input type="file" onChange={e => { setFile(e.target.files?.[0] || null); setError(null) }} accept=".pdf,.doc,.docx,.jpg,.png"
              className="w-full text-sm text-slate-500 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:bg-indigo-50 file:text-indigo-600 file:font-medium hover:file:bg-indigo-100 transition-all" />
          </div>
          <Input label={t('form.documentName')} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder={t('form.documentNamePlaceholder')} />
          <Select label={t('form.category')} value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} options={CATEGORIES} />
          <div className="flex gap-3 pt-2">
            <Button variant="secondary" onClick={() => { setOpen(false); setError(null) }} className="flex-1">{tc('cancel')}</Button>
            <Button onClick={upload} loading={loading} disabled={!file} className="flex-1">{t('form.uploadToVault')}</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
