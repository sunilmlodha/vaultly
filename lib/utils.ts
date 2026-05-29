import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number, currency = 'GBP'): string {
  return new Intl.NumberFormat('en-GB', {
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
  return new Intl.DateTimeFormat('en-GB', {
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
