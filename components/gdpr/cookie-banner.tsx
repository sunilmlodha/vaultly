'use client'
import { useState, useEffect } from 'react'
import { X, Cookie } from 'lucide-react'

const CONSENT_KEY = 'vaultly_cookie_consent'

type ConsentState = 'accepted' | 'declined' | null

export function CookieBanner() {
  const [consent, setConsent] = useState<ConsentState>('accepted') // default hidden while loading
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const stored = localStorage.getItem(CONSENT_KEY) as ConsentState | null
    if (!stored) {
      setConsent(null)
      setVisible(true)
    } else {
      setConsent(stored)
      setVisible(false)
    }
  }, [])

  const accept = () => {
    localStorage.setItem(CONSENT_KEY, 'accepted')
    setConsent('accepted')
    setVisible(false)
  }

  const decline = () => {
    localStorage.setItem(CONSENT_KEY, 'declined')
    setConsent('declined')
    setVisible(false)
  }

  if (!visible || consent !== null) return null

  return (
    <div
      role="dialog"
      aria-label="Cookie consent"
      className="fixed bottom-4 left-4 right-4 md:left-auto md:right-6 md:max-w-sm z-[100] bg-white border border-slate-200 rounded-2xl shadow-xl p-5 animate-fade-in"
    >
      <div className="flex items-start gap-3 mb-3">
        <div className="w-8 h-8 rounded-xl bg-indigo-50 flex items-center justify-center shrink-0 mt-0.5">
          <Cookie size={16} className="text-indigo-500" />
        </div>
        <div>
          <p className="text-sm font-semibold text-slate-800">Cookie & Privacy Notice</p>
          <p className="text-xs text-slate-500 mt-1 leading-relaxed">
            Vaultly uses essential cookies to keep you signed in and remember your preferences. We don't use advertising or tracking cookies.
            Your financial data stays in your account — we never sell it.
          </p>
          <p className="text-xs text-slate-400 mt-1">
            Under UK GDPR / EU GDPR Art. 7, you can withdraw consent at any time in Settings.
          </p>
        </div>
        <button
          onClick={decline}
          className="shrink-0 text-slate-400 hover:text-slate-600 transition-colors"
          aria-label="Dismiss"
        >
          <X size={16} />
        </button>
      </div>
      <div className="flex gap-2">
        <button
          onClick={decline}
          className="flex-1 text-xs font-medium text-slate-600 border border-slate-200 rounded-xl px-3 py-2 hover:bg-slate-50 transition-colors"
        >
          Essential only
        </button>
        <button
          onClick={accept}
          className="flex-1 text-xs font-medium text-white bg-indigo-500 rounded-xl px-3 py-2 hover:bg-indigo-600 transition-colors"
        >
          Accept all
        </button>
      </div>
    </div>
  )
}
