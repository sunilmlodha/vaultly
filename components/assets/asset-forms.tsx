'use client'
import { useState } from 'react'
import { Search, MapPin, Info } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import type { AssetGroup } from './category-picker'
import { useCryptoSearch, usePropertyLookup } from '@/lib/hooks/use-assets'

// ── Shared field components ───────────────────────────────────────────────────

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center gap-1.5 mb-1.5">
        <label className="text-sm font-medium text-slate-700">{label}</label>
        {hint && (
          <span className="group relative">
            <Info size={12} className="text-slate-300 cursor-help" />
            <span className="absolute left-5 top-0 z-10 w-48 rounded-xl bg-slate-800 text-white text-xs px-3 py-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
              {hint}
            </span>
          </span>
        )}
      </div>
      {children}
    </div>
  )
}

function TextInput({
  placeholder, value, onChange, prefix, type = 'text', autoFocus,
}: {
  placeholder: string; value: string; onChange: (v: string) => void
  prefix?: string; type?: string; autoFocus?: boolean
}) {
  return (
    <div className={`flex items-center rounded-xl border border-slate-200 focus-within:ring-2 focus-within:ring-indigo-300 focus-within:border-indigo-300 bg-white transition-all ${prefix ? 'pl-3' : ''}`}>
      {prefix && <span className="text-slate-400 text-sm font-medium pr-1 shrink-0">{prefix}</span>}
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={e => onChange(e.target.value)}
        autoFocus={autoFocus}
        className="flex-1 px-3 py-2.5 text-sm bg-transparent focus:outline-none rounded-xl"
      />
    </div>
  )
}

function CurrencyInput({ value, onChange, currency = 'GBP' }: {
  value: string; onChange: (v: string) => void; currency?: string
}) {
  return (
    <div className="flex items-center rounded-xl border border-slate-200 focus-within:ring-2 focus-within:ring-indigo-300 bg-white transition-all overflow-hidden">
      <span className="bg-slate-50 px-3 py-2.5 text-sm text-slate-500 font-medium border-r border-slate-200 shrink-0">
        {currency === 'GBP' ? '£' : currency === 'EUR' ? '€' : currency === 'USD' ? '$' : currency}
      </span>
      <input
        type="number"
        placeholder="0.00"
        value={value}
        onChange={e => onChange(e.target.value)}
        min="0"
        step="any"
        className="flex-1 px-3 py-2.5 text-sm bg-transparent focus:outline-none"
      />
    </div>
  )
}

// ── Form data types ───────────────────────────────────────────────────────────

export interface AssetFormData {
  name: string
  category: string
  value: number
  currency: string
  institution: string
  notes: string
}

// ── Bank form ─────────────────────────────────────────────────────────────────

const BANKS = [
  { name: 'Barclays', emoji: '🔵' }, { name: 'HSBC', emoji: '🔴' },
  { name: 'Lloyds', emoji: '🟢' }, { name: 'NatWest', emoji: '🟣' },
  { name: 'Santander', emoji: '🔴' }, { name: 'Monzo', emoji: '🌸' },
  { name: 'Starling', emoji: '💚' }, { name: 'Nationwide', emoji: '🔵' },
  { name: 'Halifax', emoji: '🔵' }, { name: 'Revolut', emoji: '⬛' },
]

const ACCOUNT_TYPES = [
  { value: 'bank_account', label: 'Current account' },
  { value: 'bank_account', label: 'Savings account' },
  { value: 'isa_cash', label: 'Cash ISA' },
]

export function BankForm({ data, onChange }: { data: Partial<AssetFormData>; onChange: (d: Partial<AssetFormData>) => void }) {
  const [showOther, setShowOther] = useState(false)

  return (
    <div className="space-y-4">
      <Field label="Which bank?" hint="Pick your bank or type any name">
        <div className="grid grid-cols-5 gap-2 mb-2">
          {BANKS.map(b => (
            <button
              key={b.name}
              onClick={() => onChange({ institution: b.name, name: data.name || `${b.name} Account` })}
              className={`flex flex-col items-center p-2 rounded-xl border text-xs font-medium transition-all ${
                data.institution === b.name
                  ? 'bg-blue-50 border-blue-300 text-blue-700'
                  : 'bg-white border-slate-100 hover:border-slate-300 text-slate-600'
              }`}
            >
              <span className="text-lg mb-0.5">{b.emoji}</span>
              <span className="text-[10px]">{b.name}</span>
            </button>
          ))}
        </div>
        <button onClick={() => setShowOther(s => !s)} className="text-xs text-indigo-500 hover:text-indigo-700">
          + Other bank
        </button>
        {showOther && (
          <div className="mt-2">
            <TextInput placeholder="Bank name" value={data.institution || ''} onChange={v => onChange({ institution: v })} autoFocus />
          </div>
        )}
      </Field>

      <Field label="Account name">
        <TextInput placeholder="e.g. Main current account" value={data.name || ''} onChange={v => onChange({ name: v })} />
      </Field>

      <Field label="Account type">
        <div className="flex flex-wrap gap-2">
          {ACCOUNT_TYPES.map(t => (
            <button
              key={t.label}
              onClick={() => onChange({ category: t.value })}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-all ${
                data.category === t.value ? 'bg-blue-500 text-white border-blue-500' : 'bg-white border-slate-200 text-slate-600 hover:border-blue-300'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </Field>

      <Field label="Current balance">
        <CurrencyInput value={data.value ? String(data.value) : ''} onChange={v => onChange({ value: parseFloat(v) || 0 })} />
      </Field>
    </div>
  )
}

// ── Investment form ───────────────────────────────────────────────────────────

const PLATFORMS = ['Hargreaves Lansdown', 'Vanguard', 'Fidelity', 'AJ Bell', 'Interactive Brokers', 'Trading 212', 'Freetrade', 'eToro']
const INV_TYPES = [
  { value: 'investment', label: 'Stocks & Shares' },
  { value: 'isa_ss', label: 'Stocks & Shares ISA' },
  { value: 'isa_lifetime', label: 'Lifetime ISA' },
  { value: 'etf', label: 'ETF / Fund' },
  { value: 'bonds', label: 'Bonds' },
]

export function InvestmentForm({ data, onChange }: { data: Partial<AssetFormData>; onChange: (d: Partial<AssetFormData>) => void }) {
  return (
    <div className="space-y-4">
      <Field label="Investment type">
        <div className="flex flex-wrap gap-2">
          {INV_TYPES.map(t => (
            <button
              key={t.value}
              onClick={() => onChange({ category: t.value })}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-all ${
                data.category === t.value ? 'bg-emerald-500 text-white border-emerald-500' : 'bg-white border-slate-200 text-slate-600 hover:border-emerald-300'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </Field>

      <Field label="Platform or broker" hint="Where are your investments held?">
        <div className="grid grid-cols-4 gap-1.5 mb-2">
          {PLATFORMS.map(p => (
            <button
              key={p}
              onClick={() => onChange({ institution: p })}
              className={`px-2 py-1.5 rounded-xl text-[11px] font-medium border transition-all ${
                data.institution === p ? 'bg-emerald-50 border-emerald-300 text-emerald-700' : 'bg-white border-slate-100 text-slate-500 hover:border-slate-300'
              }`}
            >
              {p.split(' ')[0]}
            </button>
          ))}
        </div>
      </Field>

      <Field label="Holding name" hint="e.g. 'Vanguard FTSE All-World ETF' or 'Apple Inc'">
        <TextInput placeholder="Fund, stock or account name" value={data.name || ''} onChange={v => onChange({ name: v })} />
      </Field>

      <Field label="Current value">
        <CurrencyInput value={data.value ? String(data.value) : ''} onChange={v => onChange({ value: parseFloat(v) || 0 })} />
        <p className="text-[11px] text-slate-400 mt-1">Check your platform for the latest value</p>
      </Field>
    </div>
  )
}

// ── Crypto form ───────────────────────────────────────────────────────────────

export function CryptoForm({ data, onChange }: { data: Partial<AssetFormData> & { coinQty?: string; coinId?: string }; onChange: (d: Partial<AssetFormData> & { coinQty?: string; coinId?: string }) => void }) {
  const { query, setQuery, results, searching, selectedCoin, livePrice, loadingPrice, selectCoin, reset } = useCryptoSearch()

  const qty = parseFloat(data.coinQty || '0') || 0
  const gbpValue = livePrice !== null ? qty * livePrice : null

  // Sync value back to parent
  const handleQtyChange = (v: string) => {
    const newQty = parseFloat(v) || 0
    const newVal = livePrice !== null ? newQty * livePrice : data.value
    onChange({ coinQty: v, value: newVal || 0 })
  }

  const handleSelectCoin = async (coin: typeof results[0]) => {
    await selectCoin(coin)
    onChange({
      coinId: coin.id,
      name: `${coin.name} (${coin.symbol.toUpperCase()})`,
      category: 'crypto',
    })
  }

  return (
    <div className="space-y-4">
      <Field label="Which cryptocurrency?" hint="Search by name or symbol — 10,000+ coins supported">
        {selectedCoin ? (
          <div className="flex items-center gap-3 bg-orange-50 border border-orange-200 rounded-xl px-4 py-3">
            {selectedCoin.thumb && <img src={selectedCoin.thumb} alt="" className="w-8 h-8 rounded-full" />}
            <div className="flex-1">
              <p className="text-sm font-semibold text-orange-800">{selectedCoin.name}</p>
              <p className="text-xs text-orange-500">
                {loadingPrice ? 'Fetching live price…' : livePrice !== null ? `Live: ${formatCurrency(livePrice, 'GBP')} / ${selectedCoin.symbol.toUpperCase()}` : 'Price unavailable'}
              </p>
            </div>
            <button onClick={() => { reset(); onChange({ coinId: undefined, coinQty: undefined, name: undefined, value: undefined }) }} className="text-slate-400 hover:text-slate-600 text-xs">Change</button>
          </div>
        ) : (
          <div className="relative">
            <div className="flex items-center rounded-xl border border-slate-200 focus-within:ring-2 focus-within:ring-orange-300 bg-white">
              <Search size={14} className="ml-3 text-slate-400 shrink-0" />
              <input
                className="flex-1 px-3 py-2.5 text-sm bg-transparent focus:outline-none"
                placeholder="Search Bitcoin, Ethereum, Solana…"
                value={query}
                onChange={e => setQuery(e.target.value)}
                autoFocus
              />
              {searching && <div className="mr-3 w-4 h-4 rounded-full border-2 border-orange-300 border-t-orange-600 animate-spin shrink-0" />}
            </div>
            {results.length > 0 && (
              <div className="absolute z-20 w-full mt-1 bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden">
                {results.map(c => (
                  <button key={c.id} onClick={() => handleSelectCoin(c)} className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 text-left">
                    {c.thumb && <img src={c.thumb} alt="" className="w-6 h-6 rounded-full shrink-0" />}
                    <div>
                      <p className="text-sm font-medium text-slate-800">{c.name}</p>
                      <p className="text-xs text-slate-400 uppercase">{c.symbol}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </Field>

      {selectedCoin && (
        <Field label="How much do you hold?" hint={`Enter the number of ${selectedCoin.symbol.toUpperCase()} coins/tokens`}>
          <TextInput
            type="number"
            placeholder="0.0"
            value={data.coinQty || ''}
            onChange={handleQtyChange}
            autoFocus
          />
          {gbpValue !== null && gbpValue > 0 && (
            <div className="mt-2 bg-orange-50 rounded-xl px-4 py-2.5 flex items-center justify-between">
              <p className="text-xs text-orange-600">Estimated GBP value</p>
              <p className="text-sm font-bold text-orange-700">{formatCurrency(gbpValue, 'GBP')}</p>
            </div>
          )}
        </Field>
      )}
    </div>
  )
}

// ── Property form ─────────────────────────────────────────────────────────────

export function PropertyForm({ data, onChange }: { data: Partial<AssetFormData>; onChange: (d: Partial<AssetFormData>) => void }) {
  const { postcode, setPostcode, result, loading, error, lookup } = usePropertyLookup()
  const [overrideValue, setOverrideValue] = useState('')
  const [showManual, setShowManual] = useState(false)

  const handleLookup = async () => {
    await lookup()
  }

  // Sync result → parent
  if (result?.estimatedValue && !overrideValue) {
    onChange({
      value: result.estimatedValue,
      currency: 'GBP',
      name: data.name || result.lastSale?.address || postcode,
      notes: result.disclaimer,
    })
  }

  return (
    <div className="space-y-4">
      <Field label="UK Postcode" hint="We'll look up the last sale price and estimate today's value">
        <div className="flex gap-2">
          <div className="flex-1 flex items-center rounded-xl border border-slate-200 focus-within:ring-2 focus-within:ring-amber-300 bg-white">
            <MapPin size={14} className="ml-3 text-slate-400 shrink-0" />
            <input
              className="flex-1 px-3 py-2.5 text-sm bg-transparent focus:outline-none uppercase tracking-widest"
              placeholder="SW1A 1AA"
              value={postcode}
              onChange={e => setPostcode(e.target.value.toUpperCase())}
              onKeyDown={e => e.key === 'Enter' && handleLookup()}
              autoFocus
            />
          </div>
          <button
            onClick={handleLookup}
            disabled={loading || postcode.length < 3}
            className="px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold rounded-xl disabled:opacity-50 transition-colors shrink-0"
          >
            {loading ? '…' : 'Look up'}
          </button>
        </div>
      </Field>

      {error && <p className="text-xs text-red-600 bg-red-50 rounded-xl px-3 py-2">{error}</p>}

      {result && (
        <div className={`rounded-2xl border p-4 space-y-2 ${
          result.confidence === 'high' ? 'bg-emerald-50 border-emerald-200'
          : result.confidence === 'medium' ? 'bg-amber-50 border-amber-200'
          : 'bg-slate-50 border-slate-200'
        }`}>
          {result.lastSale && (
            <div className="space-y-1">
              <p className="text-xs font-semibold text-slate-700">{result.lastSale.address}</p>
              <div className="flex gap-4 text-xs text-slate-500">
                <span>Last sold <strong>{formatCurrency(result.lastSale.price, 'GBP')}</strong></span>
                <span>{result.lastSale.date?.slice(0, 7)}</span>
                <span>{result.lastSale.propertyType}</span>
              </div>
              {result.estimatedValue && (
                <div className="flex items-center justify-between pt-1 border-t border-current/10 mt-2">
                  <p className="text-sm font-bold text-slate-800">Estimated today</p>
                  <p className="text-lg font-black text-slate-800">{formatCurrency(result.estimatedValue, 'GBP')}</p>
                </div>
              )}
            </div>
          )}
          <p className="text-[10px] text-slate-400 leading-snug">{result.disclaimer}</p>
        </div>
      )}

      <Field label="Property name or address">
        <TextInput placeholder="e.g. 12 Acacia Avenue" value={data.name || ''} onChange={v => onChange({ name: v })} />
      </Field>

      <button onClick={() => setShowManual(s => !s)} className="text-xs text-slate-400 hover:text-slate-600">
        Enter value manually instead
      </button>

      {(showManual || !result?.estimatedValue) && (
        <Field label="Current value" hint="Use a recent valuation or the auto-estimated price above">
          <CurrencyInput
            value={overrideValue || (data.value ? String(data.value) : '')}
            onChange={v => {
              setOverrideValue(v)
              onChange({ value: parseFloat(v) || 0 })
            }}
          />
        </Field>
      )}
    </div>
  )
}

// ── Pension form ──────────────────────────────────────────────────────────────

const PENSION_PROVIDERS = [
  { name: 'Nest', emoji: '🔵' }, { name: 'Aviva', emoji: '🟡' },
  { name: 'Legal & General', emoji: '🟢' }, { name: 'Standard Life', emoji: '🔴' },
  { name: 'Scottish Widows', emoji: '⚫' }, { name: 'Royal London', emoji: '🟣' },
  { name: 'Aegon', emoji: '🔵' }, { name: 'Prudential', emoji: '🔴' },
]

const PENSION_TYPES = [
  { value: 'pension', label: 'Workplace' },
  { value: 'sipp', label: 'SIPP' },
  { value: 'pension', label: 'Personal' },
]

export function PensionForm({ data, onChange }: { data: Partial<AssetFormData>; onChange: (d: Partial<AssetFormData>) => void }) {
  const [showOther, setShowOther] = useState(false)

  return (
    <div className="space-y-4">
      <Field label="Pension type">
        <div className="flex gap-2">
          {PENSION_TYPES.map(t => (
            <button
              key={t.label}
              onClick={() => onChange({ category: t.value })}
              className={`flex-1 py-2 rounded-xl text-xs font-semibold border transition-all ${
                data.category === t.value ? 'bg-violet-500 text-white border-violet-500' : 'bg-white border-slate-200 text-slate-600 hover:border-violet-300'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </Field>

      <Field label="Provider">
        <div className="grid grid-cols-4 gap-1.5 mb-2">
          {PENSION_PROVIDERS.map(p => (
            <button
              key={p.name}
              onClick={() => onChange({ institution: p.name, name: data.name || `${p.name} Pension` })}
              className={`flex flex-col items-center p-2 rounded-xl border text-[10px] font-medium transition-all ${
                data.institution === p.name ? 'bg-violet-50 border-violet-300 text-violet-700' : 'bg-white border-slate-100 text-slate-500 hover:border-slate-300'
              }`}
            >
              <span className="text-base mb-0.5">{p.emoji}</span>
              <span className="text-center leading-tight">{p.name.split(' ')[0]}</span>
            </button>
          ))}
        </div>
        {!showOther && (
          <button onClick={() => setShowOther(true)} className="text-xs text-indigo-500">+ Other provider</button>
        )}
        {showOther && (
          <TextInput placeholder="Provider name" value={data.institution || ''} onChange={v => onChange({ institution: v })} autoFocus />
        )}
      </Field>

      <Field label="Pension name">
        <TextInput placeholder="e.g. Company pension" value={data.name || ''} onChange={v => onChange({ name: v })} />
      </Field>

      <Field label="Current value" hint="Check your latest pension statement or provider app">
        <CurrencyInput value={data.value ? String(data.value) : ''} onChange={v => onChange({ value: parseFloat(v) || 0 })} />
        <p className="text-[11px] text-slate-400 mt-1">
          💡 Can't access online? Pension statements are sent annually — use last known value.
        </p>
      </Field>
    </div>
  )
}

// ── Other / Generic form ──────────────────────────────────────────────────────

const OTHER_TYPES = [
  { value: 'insurance', label: '🔐 Insurance' },
  { value: 'other', label: '🗂️ Other' },
]

export function OtherForm({ data, onChange }: { data: Partial<AssetFormData>; onChange: (d: Partial<AssetFormData>) => void }) {
  return (
    <div className="space-y-4">
      <Field label="Asset type">
        <div className="flex gap-2">
          {OTHER_TYPES.map(t => (
            <button
              key={t.value}
              onClick={() => onChange({ category: t.value })}
              className={`flex-1 py-2 rounded-xl text-xs font-semibold border transition-all ${
                data.category === t.value ? 'bg-slate-700 text-white border-slate-700' : 'bg-white border-slate-200 text-slate-600 hover:border-slate-400'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </Field>

      <Field label="Name">
        <TextInput placeholder="e.g. Life insurance, Gold coins" value={data.name || ''} onChange={v => onChange({ name: v })} autoFocus />
      </Field>

      <Field label="Institution or provider" hint="Optional">
        <TextInput placeholder="e.g. Aviva, Royal Mint" value={data.institution || ''} onChange={v => onChange({ institution: v })} />
      </Field>

      <Field label="Current value">
        <CurrencyInput value={data.value ? String(data.value) : ''} onChange={v => onChange({ value: parseFloat(v) || 0 })} />
      </Field>

      <Field label="Notes" hint="Optional">
        <textarea
          className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 resize-none"
          rows={2}
          placeholder="Policy number, maturity date, any details…"
          value={data.notes || ''}
          onChange={e => onChange({ notes: e.target.value })}
        />
      </Field>
    </div>
  )
}

// ── Form renderer — pick the right form for the group ─────────────────────────

export function AssetFormForGroup({
  group, data, onChange,
}: {
  group: AssetGroup
  data: Partial<AssetFormData> & { coinQty?: string; coinId?: string }
  onChange: (d: Partial<AssetFormData> & { coinQty?: string; coinId?: string }) => void
}) {
  switch (group) {
    case 'bank':       return <BankForm data={data} onChange={onChange} />
    case 'investment': return <InvestmentForm data={data} onChange={onChange} />
    case 'crypto':     return <CryptoForm data={data} onChange={onChange} />
    case 'property':   return <PropertyForm data={data} onChange={onChange} />
    case 'pension':    return <PensionForm data={data} onChange={onChange} />
    case 'other':      return <OtherForm data={data} onChange={onChange} />
    default:           return null
  }
}
