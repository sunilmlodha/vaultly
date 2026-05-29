'use client'
import { createContext, useContext, useState, useEffect, useCallback } from 'react'

export interface UserPrefs {
  currency: string     // e.g. 'GBP', 'EUR', 'USD', 'INR'
  locale: string       // e.g. 'en', 'de', 'fr', 'hi'
  bcpLocale: string    // e.g. 'en-GB', 'de-DE', 'fr-FR', 'hi-IN'
  ready: boolean
}

const BCP_MAP: Record<string, string> = {
  en: 'en-GB',
  de: 'de-DE',
  fr: 'fr-FR',
  hi: 'hi-IN',
}

const defaults: UserPrefs = {
  currency: 'GBP',
  locale: 'en',
  bcpLocale: 'en-GB',
  ready: false,
}

const UserPrefsContext = createContext<UserPrefs>(defaults)

export function UserPrefsProvider({ children }: { children: React.ReactNode }) {
  const [prefs, setPrefs] = useState<UserPrefs>(defaults)

  const load = useCallback(async () => {
    const locale = (typeof window !== 'undefined'
      ? localStorage.getItem('vaultly_lang') || 'en'
      : 'en')

    try {
      const res = await fetch('/api/account')
      const { account } = await res.json()
      const currency = account?.currency || 'GBP'
      setPrefs({
        currency,
        locale,
        bcpLocale: currency === 'INR' && locale === 'en'
          ? 'en-IN'
          : BCP_MAP[locale] || 'en-GB',
        ready: true,
      })
    } catch {
      setPrefs(p => ({ ...p, locale, bcpLocale: BCP_MAP[locale] || 'en-GB', ready: true }))
    }
  }, [])

  useEffect(() => {
    load()
    // Re-load when the settings page fires a currency-changed event
    const handler = () => load()
    window.addEventListener('vaultly:currency-changed', handler)
    return () => window.removeEventListener('vaultly:currency-changed', handler)
  }, [load])

  return (
    <UserPrefsContext.Provider value={prefs}>
      {children}
    </UserPrefsContext.Provider>
  )
}

export function useUserPrefs(): UserPrefs {
  return useContext(UserPrefsContext)
}

/** Format a currency value using the user's saved locale + currency */
export function useFormatCurrency() {
  const { currency, bcpLocale } = useUserPrefs()
  return (amount: number, overrideCurrency?: string) => {
    const cur = overrideCurrency || currency
    const loc = overrideCurrency && overrideCurrency === 'INR' ? 'en-IN' : bcpLocale
    return new Intl.NumberFormat(loc, {
      style: 'currency',
      currency: cur,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }
}
