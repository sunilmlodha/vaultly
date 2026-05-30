'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
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
import {
  Plus, Pencil, Trash2, Wallet, Landmark, RefreshCw,
  Upload, Bitcoin, Home, Search, CheckCircle, AlertTriangle, X,
  ChevronDown,
} from 'lucide-react'
import type { Asset, AssetCategory } from '@/lib/types'

// ── Types ────────────────────────────────────────────────────────────────────

interface CoinResult { id: string; name: string; symbol: string; thumb: string }
interface PropertyResult {
  lastSale: { address: string; price: number; date: string; propertyType: string } | null
  estimatedValue: number | null
  yearsSinceSale: number | null
  annualGrowthPct: number
  confidence: string
  disclaimer: string
}
interface ImportPreview {
  format: string
  assets: { name: string; category: string; value: number; currency: string; institution: string }[]
  count: number
}

const BADGE: Record<string, 'purple' | 'success' | 'info' | 'warning' | 'danger' | 'default'> = {
  bank_account: 'info', investment: 'success', etf: 'success', bonds: 'success',
  pension: 'purple', sipp: 'purple', riester: 'purple',
  isa_cash: 'info', isa_ss: 'success', isa_lifetime: 'success', isa_junior: 'info',
  pea: 'success', assurance_vie: 'success', livret_a: 'info',
  property: 'warning', crypto: 'danger', insurance: 'default', other: 'default',
}
const FORMAT_LABELS: Record<string, string> = {
  hargreaves_lansdown: 'Hargreaves Lansdown', vanguard: 'Vanguard',
  trading212: 'Trading 212', freetrade: 'Freetrade', generic: 'CSV',
}
function getDefaultCurrency() {
  if (typeof window === 'undefined') return 'GBP'
  return localStorage.getItem('vaultly_currency') || 'GBP'
}
const blank = { name: '', category: 'bank_account' as AssetCategory, value: '', currency: 'GBP', institution: '', notes: '' }

// ── Main component ────────────────────────────────────────────────────────────

export default function AssetsPage() {
  const { data: session } = useSession()
  const t = useTranslations('assets')
  const tc = useTranslations('common')

  const [assets, setAssets] = useState<Asset[]>([])
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Asset | null>(null)
  const [form, setForm] = useState(blank)
  const [loading, setLoading] = useState(false)

  // Crypto state
  const [coinSearch, setCoinSearch] = useState('')
  const [coinResults, setCoinResults] = useState<CoinResult[]>([])
  const [selectedCoin, setSelectedCoin] = useState<CoinResult | null>(null)
  const [coinQty, setCoinQty] = useState('')
  const [coinPrice, setCoinPrice] = useState<number | null>(null)
  const [coinSearching, setCoinSearching] = useState(false)

  // Property state
  const [postcode, setPostcode] = useState('')
  const [propertyResult, setPropertyResult] = useState<PropertyResult | null>(null)
  const [propertyLooking, setPropertyLooking] = useState(false)

  // CSV import state
  const [showImport, setShowImport] = useState(false)
  const [importPreview, setImportPreview] = useState<ImportPreview | null>(null)
  const [importing, setImporting] = useState(false)
  const [importDone, setImportDone] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  // Add button dropdown
  const [showAddMenu, setShowAddMenu] = useState(false)

  const CATEGORIES: { value: AssetCategory | string; label: string; group?: string }[] = [
    { value: 'bank_account', label: t('category.bank_account') },
    { value: 'property', label: t('category.property') },
    { value: 'crypto', label: t('category.crypto') },
    { value: 'insurance', label: t('category.insurance') },
    { value: 'other', label: t('category.other') },
    { value: 'pension', label: t('category.pension'), group: t('categoryGroup.ukPensions') },
    { value: 'sipp', label: t('category.sipp'), group: t('categoryGroup.ukPensions') },
    { value: 'isa_cash', label: t('category.isa_cash'), group: t('categoryGroup.ukIsa') },
    { value: 'isa_ss', label: t('category.isa_ss'), group: t('categoryGroup.ukIsa') },
    { value: 'isa_lifetime', label: t('category.isa_lifetime'), group: t('categoryGroup.ukIsa') },
    { value: 'isa_junior', label: t('category.isa_junior'), group: t('categoryGroup.ukIsa') },
    { value: 'investment', label: t('category.investment'), group: t('categoryGroup.ukGlobal') },
    { value: 'etf', label: t('category.etf'), group: t('categoryGroup.ukGlobal') },
    { value: 'bonds', label: t('category.bonds'), group: t('categoryGroup.ukGlobal') },
    { value: 'pea', label: t('category.pea'), group: t('categoryGroup.france') },
    { value: 'assurance_vie', label: t('category.assurance_vie'), group: t('categoryGroup.france') },
    { value: 'livret_a', label: t('category.livret_a'), group: t('categoryGroup.france') },
    { value: 'riester', label: t('category.riester'), group: t('categoryGroup.germany') },
  ]

  const load = useCallback(async () => {
    const res = await fetch('/api/assets')
    const { assets: data } = await res.json()
    setAssets(data || [])
  }, [])

  useEffect(() => { load() }, [load])

  const connectBank = async () => {
    const res = await fetch('/api/connections/auth')
    const { url } = await res.json()
    window.location.href = url
  }

  const openAdd = (category?: string) => {
    setEditing(null)
    setForm({ name: '', category: (category || 'bank_account') as AssetCategory, value: '', currency: getDefaultCurrency(), institution: '', notes: '' })
    setSelectedCoin(null); setCoinSearch(''); setCoinQty(''); setCoinPrice(null)
    setPostcode(''); setPropertyResult(null)
    setOpen(true)
    setShowAddMenu(false)
  }

  const openEdit = (a: Asset) => {
    setEditing(a)
    setForm({ name: a.name, category: a.category, value: String(a.value), currency: a.currency, institution: a.institution || '', notes: a.notes || '' })
    setOpen(true)
  }

  // ── Coin search ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (form.category !== 'crypto' || coinSearch.length < 2) { setCoinResults([]); return }
    const t = setTimeout(async () => {
      setCoinSearching(true)
      const res = await fetch(`/api/assets/crypto-price?q=${encodeURIComponent(coinSearch)}`)
      const { results } = await res.json()
      setCoinResults(results || [])
      setCoinSearching(false)
    }, 400)
    return () => clearTimeout(t)
  }, [coinSearch, form.category])

  const selectCoin = async (coin: CoinResult) => {
    setSelectedCoin(coin)
    setCoinSearch(coin.name)
    setCoinResults([])
    // Fetch live price
    const res = await fetch(`/api/assets/crypto-price?ids=${coin.id}`)
    const { prices } = await res.json()
    const gbpPrice = prices?.[0]?.gbp ?? 0
    setCoinPrice(gbpPrice)
    setForm(f => ({ ...f, name: `${coin.name} (${coin.symbol.toUpperCase()})`, currency: 'GBP' }))
  }

  const cryptoValue = selectedCoin && coinPrice && coinQty
    ? (parseFloat(coinQty) || 0) * coinPrice
    : null

  // ── Property lookup ─────────────────────────────────────────────────────────
  const lookupPostcode = async () => {
    if (!postcode.trim()) return
    setPropertyLooking(true)
    const res = await fetch(`/api/assets/property?postcode=${encodeURIComponent(postcode)}`)
    const data = await res.json()
    setPropertyResult(data)
    if (data.estimatedValue) {
      setForm(f => ({
        ...f,
        name: f.name || data.lastSale?.address || postcode,
        value: String(data.estimatedValue),
        currency: 'GBP',
        notes: data.disclaimer,
      }))
    }
    setPropertyLooking(false)
  }

  // ── Save ────────────────────────────────────────────────────────────────────
  const save = async () => {
    setLoading(true)
    let value = parseFloat(form.value) || 0

    // Override value for crypto
    if (form.category === 'crypto' && cryptoValue !== null) {
      value = cryptoValue
    }

    const payload = {
      ...form,
      value,
      notes: form.notes || (
        form.category === 'crypto' && selectedCoin
          ? `${coinQty} ${selectedCoin.symbol.toUpperCase()} @ £${coinPrice?.toFixed(2)}/coin`
          : form.notes
      ),
    }

    if (editing) {
      await fetch('/api/assets', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: editing.id, ...payload }) })
    } else {
      await fetch('/api/assets', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
    }
    setOpen(false); setLoading(false); load()
  }

  const del = async (id: string) => {
    if (!confirm(t('deleteConfirm'))) return
    await fetch('/api/assets', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) })
    load()
  }

  // ── CSV import ──────────────────────────────────────────────────────────────
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setImporting(true)
    const fd = new FormData()
    fd.append('file', file)
    fd.append('preview', 'true')
    const res = await fetch('/api/assets/import', { method: 'POST', body: fd })
    const data = await res.json()
    setImportPreview(data)
    setImporting(false)
    e.target.value = ''
  }

  const confirmImport = async () => {
    if (!importPreview) return
    setImporting(true)
    // Re-upload with preview=false — we need the file again; use sessionStorage trick
    // Instead, send the parsed assets directly via JSON
    await Promise.all(
      importPreview.assets.map(a =>
        fetch('/api/assets', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(a),
        })
      )
    )
    setImportDone(true)
    setImporting(false)
    setTimeout(() => { setShowImport(false); setImportPreview(null); setImportDone(false); load() }, 1500)
  }

  const total = assets.reduce((s, a) => s + Number(a.value), 0)
  const isCrypto = form.category === 'crypto'
  const isProperty = form.category === 'property'

  return (
    <div>
      <Topbar
        title={t('title')}
        subtitle={`${assets.length} ${t('title').toLowerCase()} · ${formatCurrency(total)}`}
        userName={session?.user?.name ?? ''}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={connectBank}>
              <Landmark size={14} /> {t('connectBank')}
            </Button>
            <Button variant="outline" size="sm" onClick={() => { setShowImport(true); setShowAddMenu(false) }}>
              <Upload size={14} /> Import CSV
            </Button>
            {/* Add dropdown */}
            <div className="relative">
              <Button onClick={() => setShowAddMenu(m => !m)} size="sm">
                <Plus size={14} /> Add <ChevronDown size={12} />
              </Button>
              {showAddMenu && (
                <div className="absolute right-0 top-9 bg-white rounded-2xl shadow-xl border border-slate-100 z-50 w-52 overflow-hidden">
                  {[
                    { icon: <Wallet size={14} />, label: 'Asset / Investment', cat: 'investment' },
                    { icon: <Bitcoin size={14} />, label: 'Cryptocurrency', cat: 'crypto' },
                    { icon: <Home size={14} />, label: 'Property', cat: 'property' },
                  ].map(opt => (
                    <button
                      key={opt.cat}
                      onClick={() => openAdd(opt.cat)}
                      className="w-full flex items-center gap-3 px-4 py-3 text-sm text-slate-700 hover:bg-slate-50 text-left"
                    >
                      <span className="text-indigo-500">{opt.icon}</span>
                      {opt.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        }
      />

      <div className="p-4 md:p-8 space-y-4 animate-fade-in">
        {assets.length === 0 ? (
          <Card><CardContent className="py-16 text-center">
            <Wallet size={32} className="text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 font-medium">{t('empty')}</p>
            <p className="text-slate-400 text-sm mb-4">{t('emptyDesc')}</p>
            <Button onClick={() => openAdd()} size="sm"><Plus size={14} /> {t('addAsset')}</Button>
          </CardContent></Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {assets.map(a => (
              <Card key={a.id} className="hover:shadow-md transition-shadow">
                <CardContent className="pt-5">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="font-semibold text-slate-800">{a.name}</p>
                      {a.institution && <p className="text-xs text-slate-400 mt-0.5">{a.institution}</p>}
                    </div>
                    <div className="flex items-center gap-1.5 flex-wrap justify-end">
                      {a.ob_account_id && (
                        <Badge variant="info" className="flex items-center gap-1">
                          <RefreshCw size={9} /> {t('live')}
                        </Badge>
                      )}
                      <Badge variant={BADGE[a.category] ?? 'default'}>
                        {CATEGORIES.find(c => c.value === a.category)?.label ?? a.category}
                      </Badge>
                    </div>
                  </div>
                  <p className="text-2xl font-bold text-indigo-600">{formatCurrency(Number(a.value), a.currency)}</p>
                  {a.ob_account_id && <p className="text-xs text-indigo-400 mt-0.5 flex items-center gap-1"><RefreshCw size={9} /> {t('liveBalance')}</p>}
                  {a.notes && <p className="text-xs text-slate-400 mt-1 truncate" title={a.notes}>{a.notes}</p>}
                  <p className="text-xs text-slate-400 mt-1">{`${t('added')} ${formatDate(a.created_at)}`}</p>
                  <div className="flex gap-2 mt-4">
                    <Button variant="ghost" size="sm" onClick={() => openEdit(a)} disabled={!!a.ob_account_id}>
                      <Pencil size={13} /> {tc('edit')}
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => del(a.id)} className="text-red-400 hover:text-red-600 hover:bg-red-50">
                      <Trash2 size={13} />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* ── Add / Edit modal ── */}
      <Modal open={open} onClose={() => setOpen(false)} title={editing ? t('editModal') : (isCrypto ? '₿ Add Cryptocurrency' : isProperty ? '🏠 Add Property' : t('addModal'))}>
        <div className="space-y-4">
          <Select label={t('form.category')} value={form.category}
            onChange={e => { setForm(f => ({ ...f, category: e.target.value as AssetCategory })); setSelectedCoin(null); setCoinSearch(''); setPropertyResult(null) }}
            options={CATEGORIES} />

          {/* ── Crypto flow ── */}
          {isCrypto && !editing && (
            <div className="space-y-3">
              <div className="relative">
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Search coin</label>
                <div className="relative">
                  <input
                    className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 pr-8"
                    placeholder="Bitcoin, Ethereum, Solana…"
                    value={coinSearch}
                    onChange={e => { setCoinSearch(e.target.value); setSelectedCoin(null) }}
                  />
                  {coinSearching && <div className="absolute right-3 top-3 w-4 h-4 rounded-full border-2 border-indigo-300 border-t-indigo-600 animate-spin" />}
                </div>
                {coinResults.length > 0 && (
                  <div className="absolute z-20 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden">
                    {coinResults.map(c => (
                      <button key={c.id} onClick={() => selectCoin(c)}
                        className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 text-left">
                        {c.thumb && <img src={c.thumb} alt={c.symbol} className="w-5 h-5 rounded-full" />}
                        <span className="text-sm font-medium">{c.name}</span>
                        <span className="text-xs text-slate-400 uppercase">{c.symbol}</span>
                        {(c as CoinResult & { market_cap_rank?: number }).market_cap_rank && <span className="ml-auto text-[10px] text-slate-300">#{(c as CoinResult & { market_cap_rank?: number }).market_cap_rank}</span>}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {selectedCoin && (
                <>
                  <div className="flex items-center gap-3 bg-indigo-50 rounded-xl px-4 py-2.5">
                    {selectedCoin.thumb && <img src={selectedCoin.thumb} alt={selectedCoin.symbol} className="w-6 h-6 rounded-full" />}
                    <div>
                      <p className="text-sm font-semibold text-indigo-800">{selectedCoin.name}</p>
                      {coinPrice !== null && (
                        <p className="text-xs text-indigo-500">Live: {formatCurrency(coinPrice, 'GBP')} / {selectedCoin.symbol.toUpperCase()}</p>
                      )}
                    </div>
                  </div>
                  <Input label="Quantity held" type="number" placeholder="0.5" value={coinQty} onChange={e => setCoinQty(e.target.value)} />
                  {cryptoValue !== null && (
                    <div className="bg-emerald-50 rounded-xl px-4 py-2.5">
                      <p className="text-xs text-emerald-600">Estimated value: <span className="font-bold">{formatCurrency(cryptoValue, 'GBP')}</span></p>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* ── Property flow ── */}
          {isProperty && !editing && (
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">UK Postcode</label>
                <div className="flex gap-2">
                  <input
                    className="flex-1 rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 uppercase"
                    placeholder="SW1A 1AA"
                    value={postcode}
                    onChange={e => setPostcode(e.target.value.toUpperCase())}
                    onKeyDown={e => e.key === 'Enter' && lookupPostcode()}
                  />
                  <Button onClick={lookupPostcode} loading={propertyLooking} size="sm">
                    <Search size={14} /> Look up
                  </Button>
                </div>
              </div>

              {propertyResult && (
                <div className={`rounded-xl border p-3 space-y-1.5 ${
                  propertyResult.confidence === 'high' ? 'bg-emerald-50 border-emerald-200'
                  : propertyResult.confidence === 'medium' ? 'bg-amber-50 border-amber-200'
                  : 'bg-slate-50 border-slate-200'
                }`}>
                  {propertyResult.lastSale && (
                    <>
                      <p className="text-xs font-semibold text-slate-700">{propertyResult.lastSale.address}</p>
                      <p className="text-xs text-slate-500">
                        Last sold: <span className="font-medium">{formatCurrency(propertyResult.lastSale.price, 'GBP')}</span>
                        {' '}in {propertyResult.lastSale.date?.slice(0, 7)} · {propertyResult.lastSale.propertyType}
                      </p>
                      {propertyResult.estimatedValue && (
                        <p className="text-sm font-bold text-slate-800">
                          Estimated today: {formatCurrency(propertyResult.estimatedValue, 'GBP')}
                          <span className="text-xs font-normal text-slate-400 ml-2">
                            ({propertyResult.annualGrowthPct.toFixed(1)}%/yr regional HPI)
                          </span>
                        </p>
                      )}
                    </>
                  )}
                  <p className="text-[10px] text-slate-400 leading-snug">{propertyResult.disclaimer}</p>
                </div>
              )}
            </div>
          )}

          {/* ── Standard fields ── */}
          <Input label={t('form.name')} placeholder={
            isCrypto ? 'Auto-filled from coin selection' : isProperty ? 'e.g. 12 Acacia Avenue' : t('form.namePlaceholder')
          } value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />

          {(!isCrypto || editing) && (
            <div className="grid grid-cols-2 gap-3">
              <Input label={t('form.value')} type="number" placeholder="0" value={form.value} onChange={e => setForm(f => ({ ...f, value: e.target.value }))} />
              <Input label={t('form.currency')} placeholder="GBP" value={form.currency} onChange={e => setForm(f => ({ ...f, currency: e.target.value }))} />
            </div>
          )}

          <Input label={t('form.institution')} placeholder={t('form.institutionPlaceholder')} value={form.institution} onChange={e => setForm(f => ({ ...f, institution: e.target.value }))} />

          <div className="flex gap-3 pt-2">
            <Button variant="secondary" onClick={() => setOpen(false)} className="flex-1">{tc('cancel')}</Button>
            <Button
              onClick={save} loading={loading} className="flex-1"
              disabled={isCrypto && !editing && (!selectedCoin || !coinQty)}
            >
              {editing ? tc('saveChanges') : t('addAsset')}
            </Button>
          </div>
        </div>
      </Modal>

      {/* ── CSV Import modal ── */}
      <Modal open={showImport} onClose={() => { setShowImport(false); setImportPreview(null); setImportDone(false) }} title="Import from CSV">
        <div className="space-y-4">
          {importDone ? (
            <div className="py-8 text-center">
              <CheckCircle size={40} className="text-emerald-500 mx-auto mb-3" />
              <p className="font-semibold text-slate-800">Imported {importPreview?.count} assets!</p>
            </div>
          ) : !importPreview ? (
            <>
              <p className="text-sm text-slate-600">
                Export a CSV from your investment platform and upload it here. Auto-detects:
              </p>
              <div className="grid grid-cols-2 gap-2">
                {['Hargreaves Lansdown', 'Vanguard', 'Trading 212', 'Freetrade'].map(name => (
                  <div key={name} className="flex items-center gap-2 bg-slate-50 rounded-xl px-3 py-2">
                    <CheckCircle size={13} className="text-emerald-500" />
                    <span className="text-xs font-medium text-slate-700">{name}</span>
                  </div>
                ))}
              </div>
              <div
                className="border-2 border-dashed border-slate-200 rounded-2xl p-8 text-center cursor-pointer hover:border-indigo-300 transition-colors"
                onClick={() => fileRef.current?.click()}
              >
                {importing ? (
                  <div className="w-6 h-6 rounded-full border-2 border-indigo-300 border-t-indigo-600 animate-spin mx-auto" />
                ) : (
                  <>
                    <Upload size={28} className="text-slate-300 mx-auto mb-2" />
                    <p className="text-sm font-medium text-slate-600">Click to upload CSV</p>
                    <p className="text-xs text-slate-400 mt-1">or drag and drop</p>
                  </>
                )}
              </div>
              <input ref={fileRef} type="file" accept=".csv,text/csv" className="hidden" onChange={handleFileChange} />
            </>
          ) : (
            <>
              <div className="flex items-center gap-2 bg-indigo-50 rounded-xl px-4 py-3">
                <CheckCircle size={15} className="text-indigo-500" />
                <div>
                  <p className="text-sm font-semibold text-indigo-800">
                    Detected: {FORMAT_LABELS[importPreview.format] ?? importPreview.format}
                  </p>
                  <p className="text-xs text-indigo-500">{importPreview.count} assets ready to import</p>
                </div>
                <button onClick={() => setImportPreview(null)} className="ml-auto text-slate-400 hover:text-slate-600">
                  <X size={14} />
                </button>
              </div>

              <div className="max-h-60 overflow-y-auto space-y-1.5">
                {importPreview.assets.map((a, i) => (
                  <div key={i} className="flex items-center justify-between px-3 py-2 bg-slate-50 rounded-xl">
                    <div>
                      <p className="text-xs font-semibold text-slate-800 truncate max-w-[160px]">{a.name}</p>
                      <p className="text-[10px] text-slate-400">{a.category} · {a.institution}</p>
                    </div>
                    <p className="text-xs font-bold text-indigo-600">{formatCurrency(a.value, a.currency)}</p>
                  </div>
                ))}
              </div>

              <div className="flex gap-3">
                <Button variant="secondary" onClick={() => setImportPreview(null)} className="flex-1">Back</Button>
                <Button onClick={confirmImport} loading={importing} className="flex-1">
                  Import {importPreview.count} assets
                </Button>
              </div>
            </>
          )}
        </div>
      </Modal>
    </div>
  )
}
