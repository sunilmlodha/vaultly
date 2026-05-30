'use client'
import { useState, useRef } from 'react'
import { useSession } from 'next-auth/react'
import { Topbar } from '@/components/layout/topbar'
import { AddAssetWizard } from '@/components/assets/add-wizard'
import { AssetCard } from '@/components/assets/asset-card'
import { Modal } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { formatCurrency } from '@/lib/utils'
import { useAssets } from '@/lib/hooks/use-assets'
import { Plus, Upload, Landmark, Wallet, CheckCircle, X } from 'lucide-react'
import type { Asset } from '@/lib/types'
import { useTranslations } from 'next-intl'
import { FORMAT_LABELS } from '@/lib/csv-parser'

// ── Category filter tabs ──────────────────────────────────────────────────────
const FILTER_TABS = [
  { key: 'all',    label: 'All',         emoji: '✨' },
  { key: 'bank',   label: 'Bank',        emoji: '🏦' },
  { key: 'invest', label: 'Investments', emoji: '📈' },
  { key: 'property', label: 'Property',  emoji: '🏠' },
  { key: 'crypto', label: 'Crypto',      emoji: '₿'  },
  { key: 'pension', label: 'Pension',    emoji: '🏛️' },
]

const TAB_CATEGORIES: Record<string, string[]> = {
  bank:     ['bank_account', 'isa_cash', 'livret_a'],
  invest:   ['investment', 'isa_ss', 'isa_lifetime', 'isa_junior', 'etf', 'bonds', 'pea', 'assurance_vie'],
  property: ['property'],
  crypto:   ['crypto'],
  pension:  ['pension', 'sipp', 'riester'],
}

function filterAssets(assets: Asset[], tab: string): Asset[] {
  if (tab === 'all') return assets
  const cats = TAB_CATEGORIES[tab]
  return cats ? assets.filter(a => cats.includes(a.category)) : assets
}

// ── Empty state ───────────────────────────────────────────────────────────────
function EmptyState({ onAdd, onConnect }: { onAdd: () => void; onConnect: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
      <div className="w-20 h-20 rounded-3xl bg-indigo-50 flex items-center justify-center text-4xl mb-5">🏦</div>
      <h3 className="text-lg font-bold text-slate-800 mb-2">Start building your vault</h3>
      <p className="text-sm text-slate-500 max-w-xs mb-6 leading-relaxed">
        Add your bank accounts, investments, property, crypto, and pensions to see your complete financial picture.
      </p>
      <div className="flex flex-col sm:flex-row gap-3">
        <button
          onClick={onConnect}
          className="flex items-center gap-2 px-5 py-3 bg-white border-2 border-indigo-200 text-indigo-600 text-sm font-semibold rounded-2xl hover:bg-indigo-50 transition-all"
        >
          <Landmark size={16} /> Connect bank account
        </button>
        <button
          onClick={onAdd}
          className="flex items-center gap-2 px-5 py-3 bg-indigo-500 hover:bg-indigo-600 text-white text-sm font-semibold rounded-2xl transition-all"
        >
          <Plus size={16} /> Add asset manually
        </button>
      </div>
    </div>
  )
}

// ── CSV Import modal (self-contained) ─────────────────────────────────────────
function CsvImportModal({ open, onClose, onImported }: {
  open: boolean; onClose: () => void; onImported: () => void
}) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [preview, setPreview] = useState<{ format: string; assets: {name:string;category:string;value:number;currency:string;institution:string}[]; count: number } | null>(null)
  const [parsing, setParsing] = useState(false)
  const [importing, setImporting] = useState(false)
  const [done, setDone] = useState(false)

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return
    setParsing(true)
    const fd = new FormData()
    fd.append('file', file); fd.append('preview', 'true')
    const res = await fetch('/api/assets/import', { method: 'POST', body: fd })
    setPreview(await res.json())
    setParsing(false)
    e.target.value = ''
  }

  const handleImport = async () => {
    if (!preview) return
    setImporting(true)
    await Promise.all(preview.assets.map(a =>
      fetch('/api/assets', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(a) })
    ))
    setDone(true); setImporting(false)
    setTimeout(() => { onClose(); setPreview(null); setDone(false); onImported() }, 1500)
  }

  const reset = () => { setPreview(null); setDone(false) }

  return (
    <Modal open={open} onClose={onClose} title="Import from CSV">
      <div className="space-y-4">
        {done ? (
          <div className="py-10 text-center">
            <div className="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-3">
              <CheckCircle size={28} className="text-emerald-500" />
            </div>
            <p className="font-semibold text-slate-800">{preview?.count} assets imported!</p>
          </div>
        ) : !preview ? (
          <div className="space-y-4">
            <p className="text-sm text-slate-600">Export a portfolio CSV from your platform and drop it here. We auto-detect the format.</p>
            <div className="grid grid-cols-2 gap-2">
              {['Hargreaves Lansdown', 'Vanguard', 'Trading 212', 'Freetrade'].map(p => (
                <div key={p} className="flex items-center gap-2 bg-slate-50 rounded-xl px-3 py-2">
                  <CheckCircle size={12} className="text-emerald-400 shrink-0" />
                  <span className="text-xs font-medium text-slate-600">{p}</span>
                </div>
              ))}
            </div>
            <div
              onClick={() => fileRef.current?.click()}
              className="border-2 border-dashed border-slate-200 hover:border-indigo-300 rounded-2xl p-10 text-center cursor-pointer transition-colors"
            >
              {parsing ? (
                <div className="w-6 h-6 rounded-full border-2 border-indigo-300 border-t-indigo-600 animate-spin mx-auto" />
              ) : (
                <>
                  <Upload size={28} className="text-slate-300 mx-auto mb-2" />
                  <p className="text-sm font-medium text-slate-600">Click to upload CSV</p>
                  <p className="text-xs text-slate-400 mt-1">or drag and drop</p>
                </>
              )}
            </div>
            <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={handleFile} />
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between bg-indigo-50 rounded-xl px-4 py-3">
              <div>
                <p className="text-sm font-semibold text-indigo-800">{(FORMAT_LABELS as Record<string, string>)[preview.format] ?? 'CSV'} detected</p>
                <p className="text-xs text-indigo-500">{preview.count} assets found</p>
              </div>
              <button onClick={reset} className="text-slate-400 hover:text-slate-600"><X size={14} /></button>
            </div>
            <div className="max-h-52 overflow-y-auto space-y-1.5 pr-1">
              {preview.assets.map((a, i) => (
                <div key={i} className="flex items-center justify-between px-3 py-2.5 bg-slate-50 rounded-xl">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-slate-800 truncate">{a.name}</p>
                    <p className="text-[10px] text-slate-400">{a.category} · {a.institution}</p>
                  </div>
                  <p className="text-xs font-bold text-indigo-600 shrink-0 ml-3">{formatCurrency(a.value, a.currency)}</p>
                </div>
              ))}
            </div>
            <div className="flex gap-3 pt-1">
              <Button variant="secondary" onClick={reset} className="flex-1">Back</Button>
              <Button onClick={handleImport} loading={importing} className="flex-1">Import {preview.count} assets</Button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  )
}

// ── Edit modal (simple, for existing assets) ──────────────────────────────────
function EditModal({ asset, open, onClose, onSave }: {
  asset: Asset | null; open: boolean; onClose: () => void
  onSave: (id: string, data: Partial<Asset>) => Promise<void>
}) {
  const t = useTranslations('assets')
  const tc = useTranslations('common')
  const [form, setForm] = useState({ name: '', value: '', currency: 'GBP', institution: '', notes: '' })
  const [saving, setSaving] = useState(false)

  if (asset && form.name !== asset.name && !saving) {
    setForm({ name: asset.name, value: String(asset.value), currency: asset.currency, institution: asset.institution || '', notes: asset.notes || '' })
  }

  const save = async () => {
    if (!asset) return
    setSaving(true)
    await onSave(asset.id, { ...form, value: parseFloat(form.value) || 0 })
    setSaving(false); onClose()
  }

  return (
    <Modal open={open} onClose={onClose} title="Edit asset">
      <div className="space-y-4">
        <Input label="Name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
        <div className="grid grid-cols-2 gap-3">
          <Input label="Value" type="number" value={form.value} onChange={e => setForm(f => ({ ...f, value: e.target.value }))} />
          <Input label="Currency" value={form.currency} onChange={e => setForm(f => ({ ...f, currency: e.target.value }))} />
        </div>
        <Input label="Institution" value={form.institution} onChange={e => setForm(f => ({ ...f, institution: e.target.value }))} />
        <div className="flex gap-3 pt-1">
          <Button variant="secondary" onClick={onClose} className="flex-1">{tc('cancel')}</Button>
          <Button onClick={save} loading={saving} className="flex-1">{tc('saveChanges')}</Button>
        </div>
      </div>
    </Modal>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function AssetsPage() {
  const { data: session } = useSession()
  const { assets, loading, add, update, remove, totalValue, load } = useAssets()
  const [wizardOpen, setWizardOpen] = useState(false)
  const [importOpen, setImportOpen] = useState(false)
  const [editingAsset, setEditingAsset] = useState<Asset | null>(null)
  const [activeTab, setActiveTab] = useState('all')

  const connectBank = async () => {
    const res = await fetch('/api/connections/auth')
    const { url } = await res.json()
    window.location.href = url
  }

  const filteredAssets = filterAssets(assets, activeTab)

  // Tab counts
  const tabCounts = FILTER_TABS.reduce<Record<string, number>>((acc, tab) => {
    acc[tab.key] = tab.key === 'all' ? assets.length : filterAssets(assets, tab.key).length
    return acc
  }, {})

  // Category totals for summary bar
  const summaryGroups = [
    { label: 'Bank', cats: TAB_CATEGORIES.bank,     emoji: '🏦', colour: 'bg-blue-100 text-blue-700' },
    { label: 'Invest', cats: TAB_CATEGORIES.invest, emoji: '📈', colour: 'bg-emerald-100 text-emerald-700' },
    { label: 'Property', cats: TAB_CATEGORIES.property, emoji: '🏠', colour: 'bg-amber-100 text-amber-700' },
    { label: 'Crypto', cats: TAB_CATEGORIES.crypto, emoji: '₿',  colour: 'bg-orange-100 text-orange-700' },
    { label: 'Pension', cats: TAB_CATEGORIES.pension, emoji: '🏛️', colour: 'bg-violet-100 text-violet-700' },
  ]

  return (
    <div className="flex flex-col h-full">
      <Topbar
        title="Assets"
        subtitle={assets.length > 0 ? `${assets.length} assets · ${formatCurrency(totalValue)}` : 'Your wealth, all in one place'}
        userName={session?.user?.name ?? ''}
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={connectBank}
              className="hidden sm:flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
            >
              <Landmark size={13} /> Connect bank
            </button>
            <button
              onClick={() => setImportOpen(true)}
              className="hidden sm:flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
            >
              <Upload size={13} /> Import CSV
            </button>
            <button
              onClick={() => setWizardOpen(true)}
              className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white bg-indigo-500 hover:bg-indigo-600 rounded-xl transition-colors"
            >
              <Plus size={15} /> Add asset
            </button>
          </div>
        }
      />

      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 p-4 md:p-8">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="h-44 bg-slate-100 rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : assets.length === 0 ? (
          <EmptyState onAdd={() => setWizardOpen(true)} onConnect={connectBank} />
        ) : (
          <div className="p-4 md:p-8 space-y-6">
            {/* Summary strip */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {summaryGroups.map(g => {
                const groupAssets = assets.filter(a => g.cats.includes(a.category))
                const total = groupAssets.reduce((s, a) => s + Number(a.value), 0)
                if (groupAssets.length === 0) return null
                return (
                  <button
                    key={g.label}
                    onClick={() => setActiveTab(g.label.toLowerCase())}
                    className={`flex items-center gap-2 px-3 py-2.5 rounded-2xl border transition-all text-left ${
                      activeTab === g.label.toLowerCase()
                        ? `${g.colour} border-current`
                        : 'bg-white border-slate-100 hover:border-slate-200'
                    }`}
                  >
                    <span className="text-lg shrink-0">{g.emoji}</span>
                    <div className="min-w-0">
                      <p className="text-[10px] text-slate-400 font-medium">{g.label}</p>
                      <p className="text-xs font-bold text-slate-800 truncate">{formatCurrency(total)}</p>
                    </div>
                  </button>
                )
              })}
            </div>

            {/* Filter tabs */}
            <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
              {FILTER_TABS.filter(t => t.key === 'all' || tabCounts[t.key] > 0).map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all shrink-0 ${
                    activeTab === tab.key
                      ? 'bg-indigo-500 text-white shadow-sm'
                      : 'bg-white border border-slate-200 text-slate-600 hover:border-slate-300'
                  }`}
                >
                  {tab.emoji} {tab.label}
                  {tabCounts[tab.key] > 0 && (
                    <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${activeTab === tab.key ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-400'}`}>
                      {tabCounts[tab.key]}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* Asset grid */}
            {filteredAssets.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-slate-400 text-sm">No assets in this category yet</p>
                <button onClick={() => setWizardOpen(true)} className="mt-3 text-indigo-500 text-sm font-medium hover:text-indigo-700">
                  + Add one now
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                {filteredAssets.map(a => (
                  <AssetCard key={a.id} asset={a} onEdit={setEditingAsset} onDelete={remove} />
                ))}
              </div>
            )}

            {/* Mobile action buttons */}
            <div className="sm:hidden flex flex-col gap-2 pt-2">
              <button onClick={connectBank} className="flex items-center justify-center gap-2 py-3 bg-white border border-slate-200 text-slate-700 text-sm font-semibold rounded-2xl">
                <Landmark size={15} /> Connect bank account
              </button>
              <button onClick={() => setImportOpen(true)} className="flex items-center justify-center gap-2 py-3 bg-white border border-slate-200 text-slate-700 text-sm font-semibold rounded-2xl">
                <Upload size={15} /> Import from CSV
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Wizard, Import, Edit modals */}
      <AddAssetWizard
        open={wizardOpen}
        onClose={() => setWizardOpen(false)}
        onSave={async (data) => { await add(data as Parameters<typeof add>[0]); }}
      />

      <CsvImportModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        onImported={load}
      />

      <EditModal
        asset={editingAsset}
        open={!!editingAsset}
        onClose={() => setEditingAsset(null)}
        onSave={update}
      />
    </div>
  )
}
