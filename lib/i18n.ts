'use client'
/**
 * Lightweight i18n helper — no path-based routing required.
 * Locale is stored in localStorage and applied at runtime.
 * Use the `useTranslation()` hook in client components.
 */

export type Locale = 'en' | 'de' | 'fr' | 'hi'

export const LOCALES: Record<Locale, { label: string; flag: string; dir: 'ltr' | 'rtl' }> = {
  en: { label: 'English',   flag: '🇬🇧', dir: 'ltr' },
  de: { label: 'Deutsch',   flag: '🇩🇪', dir: 'ltr' },
  fr: { label: 'Français',  flag: '🇫🇷', dir: 'ltr' },
  hi: { label: 'हिंदी',      flag: '🇮🇳', dir: 'ltr' },
}

const STORAGE_KEY = 'vaultly_lang'

export function getLocale(): Locale {
  if (typeof window === 'undefined') return 'en'
  const stored = localStorage.getItem(STORAGE_KEY)
  if (stored && stored in LOCALES) return stored as Locale
  // Try browser language
  const browser = navigator.language.split('-')[0]
  if (browser in LOCALES) return browser as Locale
  return 'en'
}

export function setLocale(locale: Locale) {
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEY, locale)
    window.location.reload()
  }
}

// ─── Number formatting ─────────────────────────────────────────────────────────

/**
 * Format a currency amount in the correct locale style.
 * Handles Indian number system (lakhs/crores) automatically for INR.
 */
export function formatAmount(
  value: number,
  currency: string,
  locale?: Locale
): string {
  const l = locale ?? getLocale()

  // Map locale code to BCP 47 tag
  const bcp: Record<Locale, string> = {
    en: currency === 'INR' ? 'en-IN' : 'en-GB',
    de: 'de-DE',
    fr: 'fr-FR',
    hi: 'hi-IN',
  }

  return new Intl.NumberFormat(bcp[l], {
    style: 'currency',
    currency,
    maximumFractionDigits: 2,
    minimumFractionDigits: 0,
  }).format(value)
}

/**
 * Format a date in the correct locale style.
 */
export function formatLocalDate(dateStr: string, locale?: Locale): string {
  const l = locale ?? getLocale()
  const bcp: Record<Locale, string> = { en: 'en-GB', de: 'de-DE', fr: 'fr-FR', hi: 'hi-IN' }
  return new Intl.DateTimeFormat(bcp[l], { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(dateStr))
}
