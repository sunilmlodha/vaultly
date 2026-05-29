import Link from 'next/link'
import { Vault, Shield, Users, Search, TrendingUp, RefreshCw, ArrowRight, CheckCircle } from 'lucide-react'

const features = [
  { icon: TrendingUp, title: 'Net Worth Tracking', desc: 'See your complete financial picture — assets, liabilities, and net worth in real time.' },
  { icon: Users, title: 'Family Finance', desc: 'Manage household finances together with role-based access for every family member.' },
  { icon: RefreshCw, title: 'Renewal Alerts', desc: 'Never miss a contract renewal. Track subscriptions, insurance, and utilities in one place.' },
  { icon: Search, title: 'Asset Recovery Agent', desc: 'AI-powered agent traces dormant pensions and forgotten accounts from your employment history.' },
  { icon: Shield, title: 'Bank-Grade Security', desc: 'AES-256 encryption, row-level security, and zero data selling — ever.' },
  { icon: Vault, title: 'Document Vault', desc: 'Store wills, pension statements, and insurance policies securely in your private vault.' },
]

const plans = [
  { name: 'Starter', price: 'Free', features: ['5 assets', '2 members', '10 renewals', 'Basic dashboard'] },
  { name: 'Pro', price: '£9.99/mo', features: ['25 assets', '8 members', '30 renewals', 'Asset Recovery Agent', 'Document vault'], popular: true },
  { name: 'Elite', price: '£14.99/mo', features: ['Unlimited everything', 'Full Agent workflows', 'Priority support', 'Advisor access'] },
]

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50/30 to-slate-50">
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-slate-100">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex items-center justify-between h-16">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-500 flex items-center justify-center">
              <Vault size={16} className="text-white" />
            </div>
            <span className="text-lg font-bold text-slate-800">Vaultly</span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login" className="text-sm font-medium text-slate-600 hover:text-slate-800 transition-colors px-3 py-2">Sign in</Link>
            <Link href="/signup" className="inline-flex items-center gap-1.5 bg-indigo-500 text-white text-sm font-medium px-4 py-2 rounded-xl hover:bg-indigo-600 transition-colors shadow-sm">
              Get started <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </header>

      <section className="max-w-6xl mx-auto px-4 sm:px-6 pt-20 pb-16 text-center">
        <div className="inline-flex items-center gap-2 bg-indigo-50 text-indigo-600 text-xs font-semibold px-3 py-1.5 rounded-full mb-6">
          <Search size={12} /> AI-Powered Dormant Asset Recovery
        </div>
        <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-slate-900 tracking-tight leading-tight">
          Your family&apos;s complete<br />
          <span className="text-indigo-500">financial vault</span>
        </h1>
        <p className="mt-6 text-lg text-slate-500 max-w-2xl mx-auto">
          Track every asset, liability, and renewal. Manage household finances as a team.
          Let AI recover dormant pensions and forgotten accounts you never knew existed.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mt-8">
          <Link href="/signup" className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-indigo-500 text-white font-semibold px-7 py-3.5 rounded-2xl hover:bg-indigo-600 transition-colors shadow-lg shadow-indigo-200 text-base">
            Start for free <ArrowRight size={16} />
          </Link>
          <Link href="/login" className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-white text-slate-700 font-semibold px-7 py-3.5 rounded-2xl border border-slate-200 hover:bg-slate-50 transition-colors text-base">
            Sign in to your vault
          </Link>
        </div>
        <p className="mt-4 text-xs text-slate-400">Free to start · No credit card required · FCA-aligned security</p>
      </section>

      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-16">
        <h2 className="text-2xl font-bold text-slate-800 text-center mb-10">Everything your family needs</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {features.map(({ icon: Icon, title, desc }) => (
            <div key={title} className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center mb-4">
                <Icon size={20} className="text-indigo-500" />
              </div>
              <h3 className="font-semibold text-slate-800 mb-1.5">{title}</h3>
              <p className="text-sm text-slate-500 leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-16">
        <h2 className="text-2xl font-bold text-slate-800 text-center mb-2">Simple pricing</h2>
        <p className="text-slate-500 text-center mb-10 text-sm">Save 2 months with annual billing</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-4xl mx-auto">
          {plans.map((plan) => (
            <div key={plan.name} className={`bg-white rounded-2xl p-6 border shadow-sm flex flex-col ${plan.popular ? 'border-indigo-400 shadow-indigo-100 ring-1 ring-indigo-400' : 'border-slate-100'}`}>
              {plan.popular && <div className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest mb-3">Most popular</div>}
              <h3 className="text-lg font-bold text-slate-800">{plan.name}</h3>
              <p className="text-2xl font-bold text-indigo-500 mt-1 mb-4">{plan.price}</p>
              <ul className="space-y-2 flex-1 mb-6">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm text-slate-600">
                    <CheckCircle size={14} className="text-emerald-500 shrink-0" /> {f}
                  </li>
                ))}
              </ul>
              <Link href="/signup" className={`text-center text-sm font-semibold py-2.5 rounded-xl transition-colors ${plan.popular ? 'bg-indigo-500 text-white hover:bg-indigo-600' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}>
                Get started
              </Link>
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t border-slate-100 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-indigo-500 flex items-center justify-center">
              <Vault size={12} className="text-white" />
            </div>
            <span className="text-sm font-semibold text-slate-700">Vaultly</span>
          </div>
          <p className="text-xs text-slate-400">© 2026 Vaultly. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}
