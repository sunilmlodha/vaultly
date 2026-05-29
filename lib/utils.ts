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

function getClientLocale(): string {
  if (typeof window === 'undefined') return 'en-GB'
  const lang = localStorage.getItem('vaultly_lang') || 'en'
  return BCP_MAP[lang] || 'en-GB'
}

export function formatCurrency(amount: number, currency = 'GBP'): string {
  const bcpLocale = currency === 'INR' ? 'en-IN' : getClientLocale()
  return new Intl.NumberFormat(bcpLocale, {
    style: 'currency',
    currency,
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
