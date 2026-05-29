import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

const BCP_MAP: Record<string, string> = {
  en: 'en-GB',
  de: 'de-DE',
  fr: 'fr-FR',
  hi: 'hi-IN',
}

/**
 * Read the user's display locale from localStorage (set by the language picker).
 * Falls back to 'en-GB' on the server (SSR) or if not set.
 */
function getClientLocale(currency?: string): string {
  if (typeof window === 'undefined') return 'en-GB'
  const lang = localStorage.getItem('vaultly_lang') || 'en'
  // Always use en-IN for INR regardless of UI language — correct lakh/crore formatting
  if (currency === 'INR') return 'en-IN'
  return BCP_MAP[lang] || 'en-GB'
}

/**
 * Read the user's preferred currency from localStorage (set by the currency picker in Settings).
 * Falls back to 'GBP'. This means every formatCurrency() call with no explicit currency
 * automatically uses the user's saved preference.
 */
function getClientCurrency(): string {
  if (typeof window === 'undefined') return 'GBP'
  return localStorage.getItem('vaultly_currency') || 'GBP'
}

/**
 * Format a monetary amount.
 * - If `currency` is supplied (e.g. from a DB row), uses that.
 * - If omitted, reads the user's preferred currency from localStorage.
 * - Locale (number format style) always comes from the user's language setting.
 */
export function formatCurrency(amount: number, currency?: string): string {
  const cur = currency || getClientCurrency()
  const bcpLocale = getClientLocale(cur)
  return new Intl.NumberFormat(bcpLocale, {
    style: 'currency',
    currency: cur,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

export function formatDate(date: string | Date): string {
  if (!date) return 'N/A'
  const d = new Date(date)
  if (isNaN(d.getTime())) return 'N/A'
  const bcpLocale = getClientLocale()
  return new Intl.DateTimeFormat(bcpLocale, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(d)
}

export function getDaysUntil(date: string | Date): number {
  if (!date) return 999
  const now = new Date()
  const target = new Date(date)
  if (isNaN(target.getTime())) return 999
  return Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}
