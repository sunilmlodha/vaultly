import { getRegion, APP_NAMES, APP_TAGLINES, BRAND_COLOURS } from '@/lib/config/regions'
import Link from 'next/link'
import {
  Activity, Shield, Users, Search, TrendingUp, RefreshCw, ArrowRight,
  CheckCircle, Smartphone, Star, Zap, Trophy, Bitcoin, Home, Building2,
  BarChart3, FileText, Bell, ChevronRight,
} from 'lucide-react'

// ── Data ─────────────────────────────────────────────────────────────────────

const features = [
  {
    emoji: '🏆',
    title: 'Vault Score',
    desc: 'Your living financial health score (0–850). Updates daily across 6 dimensions — net worth momentum, emergency buffer, goal velocity and more.',
    tag: 'New',
  },
  {
    emoji: '📖',
    title: 'AI Wealth Narrative',
    desc: 'Every month Claude AI writes your personal financial story — specific to your numbers, celebrating wins and flagging risks ahead.',
    tag: 'AI',
  },
  {
    emoji: '🔗',
    title: 'Open Banking',
    desc: 'Connect 95%+ of UK banks via TrueLayer. Live balances, transactions and subscription detection — no manual entry.',
    tag: null,
  },
  {
    emoji: '₿',
    title: 'Crypto & Investments',
    desc: 'Search 10,000+ coins with live CoinGecko prices. Import Hargreaves Lansdown, Vanguard and Freetrade portfolios via CSV.',
    tag: null,
  },
  {
    emoji: '🏠',
    title: 'Property Valuation',
    desc: 'Enter a UK postcode. We pull the last sale from Land Registry and estimate today\'s value using ONS regional HPI data.',
    tag: null,
  },
  {
    emoji: '🛡️',
    title: 'Dormant Asset Recovery',
    desc: 'AI agent traces forgotten pensions and bank accounts from your employment history. The average UK adult has 3+ unclaimed pension pots.',
    tag: 'AI',
  },
  {
    emoji: '👨‍👩‍👧',
    title: 'Family Vault',
    desc: 'Manage household finances as a team. Owner, partner, child, parent and advisor roles with individual views.',
    tag: null,
  },
  {
    emoji: '🔔',
    title: 'Smart Renewals',
    desc: 'Track every subscription, insurance and contract. Get alerts 30, 14 and 7 days before renewals so you\'re never caught out.',
    tag: null,
  },
  {
    emoji: '🎯',
    title: 'Goal Tracking',
    desc: 'Set savings goals with target dates. AI coach suggests strategies based on your actual spending patterns.',
    tag: null,
  },
]

const gamification = [
  { emoji: '🔥', title: 'Daily Streaks', desc: 'Build the habit of checking your vault. Freeze tokens protect your streak if you miss a day.' },
  { emoji: '⚡', title: 'Weekly Missions', desc: '3 rotating missions each week. Complete them to earn XP and unlock trophies.' },
  { emoji: '🏅', title: '26 Trophies', desc: 'Permanent achievements across wealth, goals, debt, renewals and more. Collect them all.' },
  { emoji: '📈', title: 'XP & Levels', desc: 'Every action earns XP. Level up and track your financial progress over time.' },
]

const trustItems = [
  { label: 'Open Banking', sub: 'TrueLayer licensed' },
  { label: 'UK GDPR', sub: 'ICO registered' },
  { label: 'Data encrypted', sub: 'AES-256 at rest' },
  { label: 'Zero data selling', sub: 'Your data stays yours' },
]

const plans = [
  {
    name: 'Free',
    price: '£0',
    period: 'forever',
    features: ['1 bank connection', 'Up to 10 assets manually', 'Basic Vault Score', '3 months history', 'Missions & streaks'],
    cta: 'Start free',
    highlight: false,
  },
  {
    name: 'Plus',
    price: '£6.99',
    period: '/month',
    annualNote: 'or £59/year (save 2 months)',
    features: [
      'Unlimited bank connections',
      'Unlimited assets',
      'AI Wealth Narrative (monthly)',
      'Full gamification suite',
      'CSV import (HL, Vanguard etc)',
      'Property auto-valuation',
      'Priority support',
    ],
    cta: 'Start Plus',
    highlight: true,
  },
  {
    name: 'Family',
    price: '£9.99',
    period: '/month',
    features: [
      'Everything in Plus',
      'Up to 6 household members',
      'Shared family vault',
      'Goal duels between members',
      'Family net worth dashboard',
    ],
    cta: 'Start Family',
    highlight: false,
  },
]

const faqs = [
  {
    q: 'Is my bank data safe?',
    a: 'We use TrueLayer, a regulated Open Banking provider. We never see or store your bank credentials. You authenticate directly with your bank and can revoke access at any time.',
  },
  {
    q: 'What banks does Open Banking support?',
    a: 'TrueLayer covers 95%+ of UK bank accounts — Barclays, HSBC, Lloyds, NatWest, Monzo, Starling, Nationwide, Revolut and 50+ more.',
  },
  {
    q: 'How does the Vault Score work?',
    a: 'Your score (0–850) is calculated daily across 6 components: net worth growth, emergency buffer, goal progress, debt ratio, renewal control, and app engagement. Each component has a maximum and is weighted by importance.',
  },
  {
    q: 'Can I use it for a joint account?',
    a: 'Yes. The Family plan supports up to 6 household members with individual roles — owner, partner, child, parent, and advisor.',
  },
  {
    q: 'Do you sell my data?',
    a: 'Never. Your financial data is encrypted, stored in a private database and never sold or shared with third parties. You can export or delete all your data at any time.',
  },
  {
    q: 'Is Hale available on iPhone and Android?',
    a: 'The iOS and Android apps are coming soon to the App Store and Google Play. Sign up now to get early access.',
  },
]

// ── Component ─────────────────────────────────────────────────────────────────

export default function LandingPage() {
  const region = getRegion()
  const isIndia = region === 'india'
  const appName = APP_NAMES[region]
  const tagline = APP_TAGLINES[region]
  const primaryColour = BRAND_COLOURS[region].primary
  const primaryStyle = { backgroundColor: primaryColour }
  const primaryClass = isIndia ? 'bg-orange-500 hover:bg-orange-600' : 'bg-emerald-600 hover:bg-emerald-700'
  const shadowClass = isIndia ? 'shadow-orange-200' : 'shadow-emerald-200'

  return (
    <div className="min-h-screen bg-white text-slate-900">

      {/* ── Nav ── */}
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-slate-100">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex items-center justify-between h-16">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center shadow-md" style={primaryStyle}>
              {isIndia
                ? <span className="text-white text-sm font-black">त</span>
                : <Activity size={16} className="text-white" />
              }
            </div>
            <span className="text-lg font-bold text-slate-800">{appName}</span>
          </div>
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600">
            <a href="#features" className="hover:text-slate-900 transition-colors">Features</a>
            <a href="#gamification" className="hover:text-slate-900 transition-colors">Gamification</a>
            <a href="#pricing" className="hover:text-slate-900 transition-colors">Pricing</a>
            <a href="#faq" className="hover:text-slate-900 transition-colors">FAQ</a>
          </nav>
          <div className="flex items-center gap-3">
            <Link href="/login" className="hidden sm:block text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors px-3 py-2">
              Sign in
            </Link>
            <Link href="/signup" className={`inline-flex items-center gap-1.5 ${primaryClass} text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors shadow-sm`}>
              {isIndia ? 'Tijori Kholein' : 'Get started free'} <ArrowRight size={13} />
            </Link>
          </div>
        </div>
      </header>

      {/* ── Hero ── */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 pt-20 pb-20 text-center">
        <div className="inline-flex items-center gap-2 bg-emerald-50 border border-emerald-100 text-emerald-700 text-xs font-bold px-3 py-1.5 rounded-full mb-6 uppercase tracking-wide">
          <Zap size={11} /> Now with AI Wealth Narrative &amp; Vault Score
        </div>

        <h1 className="text-4xl sm:text-5xl md:text-6xl font-black text-slate-900 tracking-tight leading-[1.1] mb-6">
          {isIndia ? (
            <>Apni Tijori.<br /><span style={{ color: primaryColour }}>Your family&apos;s financial safe.</span></>
          ) : (
            <>Your complete wealth<br /><span className="text-indigo-500">picture in one vault</span></>
          )}
        </h1>

        <p className="text-lg sm:text-xl text-slate-500 max-w-2xl mx-auto mb-8 leading-relaxed">
          {isIndia
            ? 'Track EPF, SIPs, property, gold and bank accounts. Let AI recover forgotten pension pots and score your financial health in Hindi or English.'
            : 'Track every asset, liability, pension and subscription. Connect your bank. Let AI score your financial health and write your monthly wealth story. Free to start.'
          }
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-6">
          <Link href="/signup" className={`w-full sm:w-auto inline-flex items-center justify-center gap-2 ${primaryClass} text-white font-bold px-8 py-4 rounded-2xl transition-all shadow-xl ${shadowClass} text-base`}>
            {isIndia ? 'Apni Tijori Kholein' : 'Open your vault free'} <ArrowRight size={16} />
          </Link>
          <Link href="/login" className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-slate-900 text-white font-semibold px-8 py-4 rounded-2xl hover:bg-slate-800 transition-all text-base">
            Sign in
          </Link>
        </div>

        <p className="text-xs text-slate-400 mb-12">Free forever · No credit card · UK Open Banking · iOS &amp; Android coming soon</p>

        {/* Dashboard preview mockup */}
        <div className="relative mx-auto max-w-4xl">
          <div className="absolute -inset-4 bg-gradient-to-b from-indigo-100/60 to-violet-100/40 rounded-3xl blur-2xl" />
          <div className="relative bg-white rounded-2xl border border-slate-200 shadow-2xl shadow-slate-200/60 overflow-hidden">
            {/* Fake browser chrome */}
            <div className="flex items-center gap-1.5 px-4 py-3 bg-slate-50 border-b border-slate-200">
              <div className="w-3 h-3 rounded-full bg-red-400" />
              <div className="w-3 h-3 rounded-full bg-amber-400" />
              <div className="w-3 h-3 rounded-full bg-emerald-400" />
              <div className="flex-1 mx-4 bg-white rounded-lg px-3 py-1 text-xs text-slate-400 border border-slate-200 text-left">
                vaultly-mu.vercel.app/dashboard
              </div>
            </div>
            {/* Dashboard preview */}
            <div className="p-6 bg-slate-50">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-bold text-slate-800 text-sm">Good to see you, Sunil!</h3>
                  <p className="text-xs text-slate-400">Your financial overview</p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="bg-orange-50 border border-orange-100 rounded-xl px-2.5 py-1 text-xs font-bold text-orange-600">🔥 7 day streak</div>
                  <div className="w-7 h-7 rounded-full bg-indigo-100 flex items-center justify-center text-xs font-bold text-indigo-600">S</div>
                </div>
              </div>
              {/* Stat cards */}
              <div className="grid grid-cols-4 gap-3 mb-4">
                {[
                  { label: 'NET WORTH', value: '£984,965', colour: 'text-indigo-600' },
                  { label: 'TOTAL ASSETS', value: '£1,284,965', colour: 'text-emerald-600' },
                  { label: 'LIABILITIES', value: '£300,000', colour: 'text-rose-500' },
                  { label: 'DUE RENEWALS', value: '£4,755', colour: 'text-amber-500' },
                ].map(c => (
                  <div key={c.label} className="bg-white rounded-xl p-3 border border-slate-100">
                    <p className="text-[9px] font-semibold text-slate-400 tracking-widest mb-1">{c.label}</p>
                    <p className={`text-sm font-black ${c.colour}`}>{c.value}</p>
                  </div>
                ))}
              </div>
              {/* Vault Score preview */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-white rounded-xl p-4 border border-slate-100">
                  <div className="flex items-center gap-2 mb-2">
                    <Trophy size={14} className="text-amber-500" />
                    <span className="text-xs font-bold text-slate-700">Vault Score</span>
                  </div>
                  <div className="flex items-end gap-3">
                    <span className="text-3xl font-black text-amber-500">410</span>
                    <div>
                      <p className="text-xs font-bold text-amber-600">Building</p>
                      <p className="text-[10px] text-slate-400">— Unchanged this week</p>
                    </div>
                  </div>
                  <div className="mt-2 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-amber-400 rounded-full" style={{ width: '48%' }} />
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">410 / 850</p>
                </div>
                <div className="bg-gradient-to-br from-indigo-50 to-violet-50 rounded-xl p-4 border border-indigo-100">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-sm">📖</span>
                    <span className="text-xs font-bold text-indigo-700">AI Wealth Story</span>
                    <span className="text-[9px] bg-indigo-100 text-indigo-500 px-1.5 py-0.5 rounded-full">May 2026</span>
                  </div>
                  <p className="text-[11px] text-slate-600 leading-snug">
                    "May was a milestone month. Your net worth crossed £984k — up £43,000 from April. The pension contributions are compounding quietly…"
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Trust bar ── */}
      <div className="border-y border-slate-100 bg-slate-50/50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-5">
          <div className="flex flex-wrap items-center justify-center gap-8">
            {trustItems.map(t => (
              <div key={t.label} className="flex items-center gap-2">
                <CheckCircle size={14} className="text-emerald-500" />
                <div>
                  <span className="text-xs font-bold text-slate-700">{t.label}</span>
                  <span className="text-xs text-slate-400 ml-1">· {t.sub}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Features ── */}
      <section id="features" className="max-w-6xl mx-auto px-4 sm:px-6 py-24">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-black text-slate-900 mb-4">
            Everything your wealth needs
          </h2>
          <p className="text-slate-500 max-w-xl mx-auto">
            From live bank balances to AI-written stories — {appName} connects every part of your financial life.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {features.map(({ emoji, title, desc, tag }) => (
            <div key={title} className="group bg-white rounded-2xl p-6 border border-slate-100 shadow-sm hover:shadow-lg hover:shadow-slate-100 hover:-translate-y-0.5 transition-all duration-200">
              <div className="flex items-start justify-between mb-4">
                <span className="text-3xl">{emoji}</span>
                {tag && (
                  <span className={`text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wide ${
                    tag === 'AI' ? 'bg-violet-100 text-violet-600' : 'bg-indigo-100 text-indigo-600'
                  }`}>
                    {tag}
                  </span>
                )}
              </div>
              <h3 className="font-bold text-slate-800 mb-2">{title}</h3>
              <p className="text-sm text-slate-500 leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Gamification ── */}
      <section id="gamification" className="bg-gradient-to-br from-indigo-600 to-violet-700 py-24">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 bg-white/10 text-white text-xs font-bold px-3 py-1.5 rounded-full mb-4 uppercase tracking-wide">
              <Zap size={11} /> Gamified wealth building
            </div>
            <h2 className="text-3xl sm:text-4xl font-black text-white mb-4">
              Finance that keeps you coming back
            </h2>
            <p className="text-indigo-200 max-w-xl mx-auto">
              Most finance apps are passive. {appName} is designed like a game — so you actually use it every day.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {gamification.map(g => (
              <div key={g.title} className="bg-white/10 backdrop-blur rounded-2xl p-6 border border-white/20 text-white">
                <span className="text-3xl mb-3 block">{g.emoji}</span>
                <h3 className="font-bold mb-2">{g.title}</h3>
                <p className="text-sm text-indigo-200 leading-relaxed">{g.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ── */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-24">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-black text-slate-900 mb-4">Up and running in 5 minutes</h2>
          <p className="text-slate-500">No import needed. Connect your bank and we fill in the rest.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
          {[
            { n: '01', title: 'Create your Hale', desc: 'Sign up with Google, email or Microsoft. No credit card needed. Takes 30 seconds.' },
            { n: '02', title: 'Connect your bank', desc: 'Link via Open Banking (TrueLayer). We get live balances — you keep all credentials.' },
            { n: '03', title: 'See your picture', desc: 'Vault Score, AI story, net worth trend, renewals calendar. Your whole wealth in one view.' },
          ].map(step => (
            <div key={step.n} className="text-center">
              <div className="w-14 h-14 rounded-2xl bg-indigo-50 flex items-center justify-center text-2xl font-black text-indigo-500 mx-auto mb-4">{step.n}</div>
              <h3 className="font-bold text-slate-800 mb-2">{step.title}</h3>
              <p className="text-sm text-slate-500 leading-relaxed">{step.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Pricing ── */}
      <section id="pricing" className="bg-slate-50 py-24">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-black text-slate-900 mb-4">Simple, honest pricing</h2>
            <p className="text-slate-500">Start free. Upgrade when you're ready. Cancel any time.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-4xl mx-auto">
            {plans.map(plan => (
              <div key={plan.name} className={`bg-white rounded-2xl p-7 flex flex-col shadow-sm ${
                plan.highlight
                  ? 'border-2 border-indigo-400 shadow-indigo-100 ring-4 ring-indigo-50 scale-[1.02]'
                  : 'border border-slate-100'
              }`}>
                {plan.highlight && (
                  <div className="text-[10px] font-black text-indigo-500 uppercase tracking-widest mb-2">Most popular</div>
                )}
                <h3 className="text-xl font-black text-slate-800">{plan.name}</h3>
                <div className="mt-1 mb-1">
                  <span className="text-3xl font-black text-indigo-500">{plan.price}</span>
                  <span className="text-sm text-slate-400">{plan.period}</span>
                </div>
                {plan.annualNote && (
                  <p className="text-[11px] text-emerald-600 font-medium mb-3">{plan.annualNote}</p>
                )}
                <ul className="space-y-2.5 flex-1 my-5">
                  {plan.features.map(f => (
                    <li key={f} className="flex items-start gap-2 text-sm text-slate-600">
                      <CheckCircle size={14} className="text-emerald-500 mt-0.5 shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Link
                  href="/signup"
                  className={`text-center text-sm font-bold py-3 rounded-xl transition-all ${
                    plan.highlight
                      ? 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-lg shadow-emerald-200'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {plan.cta}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Mobile apps ── */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-24 text-center">
        <div className="inline-flex items-center gap-2 bg-slate-100 text-slate-600 text-xs font-bold px-3 py-1.5 rounded-full mb-6 uppercase tracking-wide">
          <Smartphone size={11} /> Coming soon
        </div>
        <h2 className="text-3xl sm:text-4xl font-black text-slate-900 mb-4">
          {appName} in your pocket
        </h2>
        <p className="text-slate-500 max-w-xl mx-auto mb-8">
          Native iOS and Android apps coming soon. Push notifications for renewals, streak alerts,
          and your Vault Score update — wherever you are.
        </p>
        <div className="flex items-center justify-center gap-4 flex-wrap">
          {/* App Store badge */}
          <div className="flex items-center gap-3 bg-slate-900 text-white px-5 py-3 rounded-2xl cursor-not-allowed opacity-60 select-none">
            <svg viewBox="0 0 24 24" className="w-6 h-6 fill-white" aria-hidden>
              <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
            </svg>
            <div className="text-left">
              <p className="text-[10px] opacity-70">Download on the</p>
              <p className="text-sm font-bold">App Store</p>
            </div>
          </div>
          {/* Play Store badge */}
          <div className="flex items-center gap-3 bg-slate-900 text-white px-5 py-3 rounded-2xl cursor-not-allowed opacity-60 select-none">
            <svg viewBox="0 0 24 24" className="w-6 h-6 fill-white" aria-hidden>
              <path d="M3.18 23.76c.33.19.71.2 1.06.03L14.38 12 4.24.21C3.89.04 3.51.05 3.18.24 2.53.6 2.14 1.3 2.14 2.07v19.86c0 .77.39 1.47 1.04 1.83zM16.09 10.28l2.35-2.35L5.52.41l10.57 9.87zm2.35 5.79L16.09 13.7 5.52 23.59l12.92-7.52zM21.89 10.6l-2.79-1.61-2.62 2.62 2.62 2.62 2.82-1.63c.8-.46.8-1.54-.03-2z" />
            </svg>
            <div className="text-left">
              <p className="text-[10px] opacity-70">Get it on</p>
              <p className="text-sm font-bold">Google Play</p>
            </div>
          </div>
        </div>
        <p className="text-xs text-slate-400 mt-4">Join the waitlist — enter your email above to be first.</p>
      </section>

      {/* ── FAQ ── */}
      <section id="faq" className="bg-slate-50 py-24">
        <div className="max-w-3xl mx-auto px-4 sm:px-6">
          <h2 className="text-3xl font-black text-slate-900 text-center mb-12">Common questions</h2>
          <div className="space-y-4">
            {faqs.map(({ q, a }) => (
              <details key={q} className="group bg-white rounded-2xl border border-slate-100 shadow-sm">
                <summary className="flex items-center justify-between gap-4 px-6 py-4 cursor-pointer list-none font-semibold text-slate-800 text-sm">
                  {q}
                  <ChevronRight size={16} className="text-slate-400 group-open:rotate-90 transition-transform shrink-0" />
                </summary>
                <p className="px-6 pb-5 text-sm text-slate-500 leading-relaxed">{a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="bg-emerald-700 py-20 text-center">
        <div className="max-w-2xl mx-auto px-4 sm:px-6">
          <h2 className="text-3xl sm:text-4xl font-black text-white mb-4">
            Start building your wealth picture today
          </h2>
          <p className="text-indigo-200 mb-8 text-lg">
            Free forever. No credit card. Up in 5 minutes.
          </p>
          <Link href="/signup" className="inline-flex items-center gap-2 bg-white text-emerald-700 font-bold px-8 py-4 rounded-2xl hover:bg-emerald-50 transition-all text-base shadow-xl shadow-emerald-800/30">
            Open your free vault <ArrowRight size={16} />
          </Link>
          <p className="text-indigo-300 text-xs mt-4">Join thousands already using {appName}</p>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="bg-slate-900 text-slate-400 py-12">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-10">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-7 h-7 rounded-xl bg-emerald-600 flex items-center justify-center">
                  <Activity size={13} className="text-white" />
                </div>
                <span className="text-sm font-bold text-white">Vaultly</span>
              </div>
              <p className="text-xs leading-relaxed">The complete wealth management app for UK families.</p>
            </div>
            <div>
              <h4 className="text-xs font-bold text-white uppercase tracking-widest mb-3">Product</h4>
              <ul className="space-y-2 text-xs">
                <li><a href="#features" className="hover:text-white transition-colors">Features</a></li>
                <li><a href="#pricing" className="hover:text-white transition-colors">Pricing</a></li>
                <li><a href="#gamification" className="hover:text-white transition-colors">Gamification</a></li>
                <li><Link href="/signup" className="hover:text-white transition-colors">Sign up</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-xs font-bold text-white uppercase tracking-widest mb-3">Legal</h4>
              <ul className="space-y-2 text-xs">
                <li><a href="#" className="hover:text-white transition-colors">Privacy Policy</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Terms of Service</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Cookie Policy</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Security</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-xs font-bold text-white uppercase tracking-widest mb-3">Support</h4>
              <ul className="space-y-2 text-xs">
                <li><a href="mailto:support@vaultly.app" className="hover:text-white transition-colors">support@vaultly.app</a></li>
                <li><a href="#faq" className="hover:text-white transition-colors">FAQ</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Status</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-slate-800 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3">
            <p className="text-xs">© 2026 {appName}. All rights reserved.</p>
            <p className="text-xs">
              Open Banking powered by{' '}
              <span className="text-slate-300 font-medium">TrueLayer</span>
              {' · '}
              FCA-aligned security
              {' · '}
              ICO registered
            </p>
          </div>
          <p className="text-[11px] text-slate-600 mt-3 text-center leading-relaxed">
            Vaultly is not a financial adviser. Vault Score and all content is for informational purposes only
            and does not constitute financial advice. Always consult a qualified financial adviser before making investment decisions.
          </p>
        </div>
      </footer>
    </div>
  )
}
