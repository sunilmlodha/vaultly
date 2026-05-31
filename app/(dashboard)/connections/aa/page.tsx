'use client'
import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useSearchParams } from 'next/navigation'
import { Topbar } from '@/components/layout/topbar'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { CheckCircle, Lock, ExternalLink, Info, ChevronRight, Shield, AlertCircle } from 'lucide-react'
import { Suspense } from 'react'

// Account Aggregator (AA) connection page for India
// Implements Finvu AA API (ReBIT AA 2.0 spec)
// Sandbox: FINVU_CLIENT_ID + FINVU_CLIENT_SECRET env vars required for live

const AA_SOURCES = [
  {
    category: 'Bank Accounts',
    emoji: '🏦',
    description: 'Current, savings and FD accounts',
    providers: [
      { name: 'State Bank of India', short: 'SBI', status: 'available' },
      { name: 'HDFC Bank', short: 'HDFC', status: 'available' },
      { name: 'ICICI Bank', short: 'ICICI', status: 'available' },
      { name: 'Axis Bank', short: 'Axis', status: 'available' },
      { name: 'Kotak Mahindra', short: 'Kotak', status: 'available' },
      { name: 'Bank of Baroda', short: 'BoB', status: 'available' },
    ],
  },
  {
    category: 'Mutual Funds',
    emoji: '📈',
    description: 'All MF folios via CAMS & KFintech',
    providers: [
      { name: 'CAMS (99% of MF AUM)', short: 'CAMS', status: 'available' },
      { name: 'KFintech', short: 'KFin', status: 'available' },
    ],
  },
  {
    category: 'Pensions',
    emoji: '🏛️',
    description: 'EPFO and NPS accounts',
    providers: [
      { name: 'EPFO (EPF)', short: 'EPFO', status: 'coming_soon' },
      { name: 'NPS / PFRDA', short: 'NPS', status: 'coming_soon' },
    ],
  },
  {
    category: 'Insurance',
    emoji: '🔐',
    description: 'Life and general insurance policies',
    providers: [
      { name: 'LIC of India', short: 'LIC', status: 'available' },
      { name: 'HDFC Life', short: 'HDFC', status: 'available' },
      { name: 'ICICI Prudential', short: 'ICICI', status: 'available' },
    ],
  },
  {
    category: 'Tax Data',
    emoji: '📋',
    description: 'Form 26AS, AIS from Income Tax',
    providers: [
      { name: 'Income Tax Dept (Form 26AS)', short: 'ITD', status: 'coming_soon' },
    ],
  },
]

const HOW_IT_WORKS = [
  {
    step: '01',
    title: 'You give consent',
    desc: 'You choose which accounts to share and for how long. You control everything.',
  },
  {
    step: '02',
    title: 'Bank authenticates you',
    desc: 'You log in directly with your bank. Tijori never sees your credentials.',
  },
  {
    step: '03',
    title: 'Data flows securely',
    desc: 'Account Aggregator sends encrypted data to Tijori. Consent can be revoked any time.',
  },
]

const FI_TYPE_OPTIONS = [
  { id: 'DEPOSIT', label: 'Bank Accounts & FDs', emoji: '🏦' },
  { id: 'MUTUAL_FUNDS', label: 'Mutual Funds', emoji: '📈' },
  { id: 'INSURANCE', label: 'Insurance Policies', emoji: '🔐' },
  { id: 'NPS', label: 'NPS Pension', emoji: '🏛️' },
  { id: 'EQUITIES', label: 'Stocks & Demat', emoji: '📊' },
]

function AAConnectionContent() {
  const { data: session } = useSession()
  const searchParams = useSearchParams()
  const [connecting, setConnecting] = useState(false)
  const [error, setError] = useState('')
  const [selectedTypes, setSelectedTypes] = useState(['DEPOSIT', 'MUTUAL_FUNDS'])
  const [sandboxMode, setSandboxMode] = useState(false)

  const successAssets = searchParams.get('assets')
  const errorParam = searchParams.get('error')
  const demoSuccess = searchParams.get('demo') === 'success'
  const demoFiTypes = searchParams.get('fiTypes')?.split(',') ?? []

  const toggleType = (id: string) => {
    setSelectedTypes(prev =>
      prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id]
    )
  }

  const handleConnect = async () => {
    setConnecting(true)
    setError('')
    setSandboxMode(false)
    try {
      const res = await fetch('/api/india/aa/consent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fiTypes: selectedTypes }),
      })
      const data = await res.json()
      if (data.sandbox) {
        // No real credentials — show setup instructions
        setSandboxMode(true)
        setConnecting(false)
        return
      }
      if (data.redirectUrl) {
        window.location.href = data.redirectUrl
      } else {
        setError(data.error ?? 'Failed to initiate connection')
      }
    } catch {
      setError('Connection failed. Please try again.')
    } finally {
      setConnecting(false)
    }
  }

  return (
    <div>
      <Topbar
        title="Connect via Account Aggregator"
        subtitle="RBI-regulated Open Finance · Zero credential sharing"
        userName={session?.user?.name ?? ''}
      />

      <div className="p-4 md:p-8 max-w-3xl mx-auto space-y-6">

        {/* Hero */}
        <div className="bg-gradient-to-br from-orange-50 to-amber-50 rounded-3xl p-6 border border-orange-100">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-orange-500 flex items-center justify-center shrink-0 text-2xl">
              🇮🇳
            </div>
            <div>
              <h2 className="font-bold text-slate-800 mb-1">India's Open Banking — Account Aggregator</h2>
              <p className="text-sm text-slate-600 leading-relaxed">
                RBI's Account Aggregator framework lets you share bank accounts, mutual funds, insurance
                and pension data with your consent — more powerful than UK Open Banking.
              </p>
              <div className="flex flex-wrap gap-2 mt-3">
                <span className="text-[11px] bg-orange-100 text-orange-700 px-2 py-1 rounded-full font-semibold">
                  🔒 RBI regulated
                </span>
                <span className="text-[11px] bg-emerald-100 text-emerald-700 px-2 py-1 rounded-full font-semibold">
                  ✓ Zero credential sharing
                </span>
                <span className="text-[11px] bg-blue-100 text-blue-700 px-2 py-1 rounded-full font-semibold">
                  ↩ Revoke any time
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Sandbox mode — credentials not configured */}
        {sandboxMode && (
          <Card className="border-orange-200 bg-orange-50">
            <CardContent className="py-5 space-y-3">
              <div className="flex items-start gap-3">
                <Info size={18} className="text-orange-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-bold text-orange-800">Finvu credentials not configured</p>
                  <p className="text-xs text-orange-700 mt-1 leading-relaxed">
                    To enable live Account Aggregator connections, register with Finvu and add your credentials to the Tijori Vercel project.
                  </p>
                </div>
              </div>
              <div className="bg-white rounded-xl border border-orange-200 p-4 space-y-2 text-xs">
                <p className="font-semibold text-slate-700">Setup steps:</p>
                <div className="space-y-1.5 text-slate-600">
                  <p>1. Email <span className="font-mono bg-slate-100 px-1 rounded">partnerships@finvu.in</span> to register as FIU</p>
                  <p>2. Get your <span className="font-mono bg-slate-100 px-1 rounded">clientId</span>, <span className="font-mono bg-slate-100 px-1 rounded">clientSecret</span>, <span className="font-mono bg-slate-100 px-1 rounded">fiuId</span></p>
                  <p>3. Add to Vercel Tijori project environment variables:</p>
                  <div className="bg-slate-900 rounded-lg p-3 font-mono text-emerald-400 text-[11px] leading-relaxed">
                    FINVU_CLIENT_ID=your_client_id<br/>
                    FINVU_CLIENT_SECRET=your_secret<br/>
                    FINVU_FIU_ID=your_fiu_id<br/>
                    FINVU_BASE_URL=https://webvwdev.finvu.in
                  </div>
                  <p>4. Redeploy Tijori → AA connections go live automatically</p>
                </div>
              </div>
              <p className="text-[11px] text-orange-600">
                Sandbox available immediately after registration. Production FIU approval takes 3-6 months via RBI.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Demo success state */}
        {demoSuccess && (
          <Card className="border-emerald-200 bg-emerald-50">
            <CardContent className="py-4 flex items-center gap-3">
              <CheckCircle size={20} className="text-emerald-600 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-emerald-800">Demo: consent flow completed!</p>
                <p className="text-xs text-emerald-600 mt-0.5">
                  Selected: {demoFiTypes.length > 0 ? demoFiTypes.join(', ') : 'Bank + MF'}.
                  With live Finvu credentials, your financial data would now be imported automatically.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Real success state */}
        {successAssets && (
          <Card className="border-emerald-200 bg-emerald-50">
            <CardContent className="py-4 flex items-center gap-3">
              <CheckCircle size={20} className="text-emerald-600 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-emerald-800">{successAssets} assets imported!</p>
                <p className="text-xs text-emerald-600 mt-0.5">
                  Your financial data is now in your vault. <a href="/assets" className="font-bold underline">View assets →</a>
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Error state */}
        {errorParam && (
          <Card className="border-red-200 bg-red-50">
            <CardContent className="py-4 flex items-center gap-3">
              <AlertCircle size={18} className="text-red-600 shrink-0" />
              <p className="text-sm text-red-700">
                {errorParam === 'rejected' ? 'You declined the consent request. You can try again any time.'
                : errorParam === 'fetch_failed' ? 'Could not fetch your financial data. Please try again.'
                : 'Connection failed. Please try again.'}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Select data types + Connect button */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Shield size={16} className="text-orange-500" /> What data would you like to connect?
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {FI_TYPE_OPTIONS.map(opt => (
                <button
                  key={opt.id}
                  onClick={() => toggleType(opt.id)}
                  className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-xs font-medium transition-all text-left ${
                    selectedTypes.includes(opt.id)
                      ? 'bg-orange-50 border-orange-300 text-orange-700'
                      : 'bg-white border-slate-200 text-slate-600 hover:border-orange-200'
                  }`}
                >
                  <span className="text-base">{opt.emoji}</span>
                  <span>{opt.label}</span>
                  {selectedTypes.includes(opt.id) && (
                    <CheckCircle size={12} className="ml-auto text-orange-500 shrink-0" />
                  )}
                </button>
              ))}
            </div>
            {error && <p className="text-xs text-red-600">{error}</p>}
            <button
              onClick={handleConnect}
              disabled={connecting || selectedTypes.length === 0}
              className="w-full py-3.5 bg-orange-500 hover:bg-orange-600 disabled:bg-slate-200 disabled:text-slate-400 text-white font-bold text-sm rounded-2xl transition-all"
            >
              {connecting ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                  Opening Finvu consent…
                </span>
              ) : (
                'Connect via Finvu Account Aggregator'
              )}
            </button>
            <p className="text-[10px] text-slate-400 text-center">
              You will be redirected to Finvu to authenticate with your bank directly.
              Tijori never sees your banking passwords.
            </p>
          </CardContent>
        </Card>

        {/* How it works */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Shield size={16} className="text-orange-500" /> How it works
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {HOW_IT_WORKS.map(s => (
                <div key={s.step} className="text-center">
                  <div className="w-10 h-10 rounded-2xl bg-orange-50 flex items-center justify-center text-lg font-black text-orange-500 mx-auto mb-2">
                    {s.step}
                  </div>
                  <p className="text-xs font-bold text-slate-800 mb-1">{s.title}</p>
                  <p className="text-[11px] text-slate-500 leading-snug">{s.desc}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Available data sources */}
        <div className="space-y-4">
          <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wide">What you can connect</h3>
          {AA_SOURCES.map(source => (
            <Card key={source.category}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <span className="text-lg">{source.emoji}</span>
                  {source.category}
                  <span className="text-[10px] text-slate-400 font-normal ml-1">— {source.description}</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {source.providers.map(p => (
                    <div
                      key={p.name}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border ${
                        p.status === 'available'
                          ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                          : 'bg-slate-50 border-slate-200 text-slate-400'
                      }`}
                    >
                      {p.status === 'available'
                        ? <CheckCircle size={11} />
                        : <Lock size={11} />
                      }
                      {p.short}
                      {p.status === 'coming_soon' && (
                        <span className="text-[9px] opacity-60">soon</span>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Learn more */}
        <div className="flex gap-3 justify-center">
          <a href="/assets" className="text-sm text-slate-500 hover:text-slate-700 underline">
            Add assets manually instead
          </a>
          <a href="https://www.rbi.org.in/scripts/PublicationsView.aspx?id=20136" target="_blank" rel="noopener noreferrer" className="text-sm text-orange-500 hover:text-orange-700 flex items-center gap-1">
            RBI AA policy <ExternalLink size={12} />
          </a>
        </div>

        {/* Comparison vs UK Open Banking */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">India AA vs UK Open Banking</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-slate-100">
                    <th className="text-left py-2 text-slate-500 font-medium">Feature</th>
                    <th className="text-center py-2 text-orange-600 font-bold">India AA</th>
                    <th className="text-center py-2 text-indigo-600 font-bold">UK OB</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {[
                    ['Bank accounts', '✅', '✅'],
                    ['Mutual funds', '✅', '❌'],
                    ['Pension (EPF/NPS)', '✅ (2025)', '❌'],
                    ['Insurance policies', '✅', '❌'],
                    ['Tax data (26AS)', '✅ (2025)', '❌'],
                    ['Stock / Demat', '✅', '❌'],
                  ].map(([feature, india, uk]) => (
                    <tr key={feature}>
                      <td className="py-2 text-slate-600">{feature}</td>
                      <td className="py-2 text-center">{india}</td>
                      <td className="py-2 text-center">{uk}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-[10px] text-slate-400 mt-3">
              India's AA framework is more comprehensive than UK Open Banking — it covers all major asset classes.
            </p>
          </CardContent>
        </Card>

      </div>
    </div>
  )
}

export default function AAConnectionPage() {
  return (
    <Suspense>
      <AAConnectionContent />
    </Suspense>
  )
}
