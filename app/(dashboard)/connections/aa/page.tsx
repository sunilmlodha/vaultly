'use client'
import { useState } from 'react'
import { useSession } from 'next-auth/react'
import { Topbar } from '@/components/layout/topbar'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { CheckCircle, Lock, ExternalLink, Info, ChevronRight, Shield, Building2 } from 'lucide-react'

// Account Aggregator (AA) connection page for India
// Powered by RBI's Account Aggregator framework
// FIU registration with Finvu/Anumati pending — UI ready

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

export default function AAConnectionPage() {
  const { data: session } = useSession()
  const [showWhy, setShowWhy] = useState(false)

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

        {/* Registration notice */}
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="py-4 flex items-start gap-3">
            <Info size={18} className="text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-amber-800">FIU registration in progress</p>
              <p className="text-xs text-amber-700 mt-0.5 leading-relaxed">
                We're registering as a Financial Information User (FIU) with RBI via Finvu.
                Live connections will be available once approved. Register your interest below.
              </p>
              <button className="mt-2 text-xs font-semibold text-amber-700 underline hover:text-amber-900">
                Notify me when AA is live →
              </button>
            </div>
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

        {/* CTA */}
        <Card className="bg-slate-900 border-0">
          <CardContent className="py-6 text-center">
            <p className="text-white font-bold mb-2">Coming soon</p>
            <p className="text-slate-400 text-sm mb-4">
              Live AA connections launching Q3 2026. Add assets manually for now.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <a
                href="/assets"
                className="inline-flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold px-6 py-3 rounded-xl transition-colors"
              >
                Add assets manually <ChevronRight size={14} />
              </a>
              <a
                href="https://www.rbi.org.in/scripts/PublicationsView.aspx?id=20136"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 text-white text-sm font-semibold px-6 py-3 rounded-xl transition-colors"
              >
                Learn about AA <ExternalLink size={13} />
              </a>
            </div>
          </CardContent>
        </Card>

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
