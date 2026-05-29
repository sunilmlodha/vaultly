import { describe, it, expect, beforeEach } from 'vitest'
import { cn, formatCurrency, formatDate, getDaysUntil, getInitials } from '@/lib/utils'

// ── cn() ──────────────────────────────────────────────────────────────────────
describe('cn()', () => {
  it('merges class names', () => {
    expect(cn('a', 'b')).toBe('a b')
  })

  it('deduplicates conflicting Tailwind classes (last wins)', () => {
    expect(cn('text-red-500', 'text-blue-500')).toBe('text-blue-500')
  })

  it('ignores falsy values', () => {
    expect(cn('a', false && 'b', undefined, null, 'c')).toBe('a c')
  })

  it('handles empty input', () => {
    expect(cn()).toBe('')
  })

  it('handles object syntax', () => {
    expect(cn({ 'font-bold': true, 'text-sm': false })).toBe('font-bold')
  })
})

// ── formatCurrency() ─────────────────────────────────────────────────────────
describe('formatCurrency()', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('formats GBP with explicit currency', () => {
    const result = formatCurrency(1000, 'GBP')
    expect(result).toMatch(/£/)
    expect(result).toMatch(/1,000/)
  })

  it('formats EUR', () => {
    const result = formatCurrency(2500, 'EUR')
    expect(result).toMatch(/2/)
    expect(result).toMatch(/500/)
  })

  it('formats USD', () => {
    const result = formatCurrency(99, 'USD')
    expect(result).toMatch(/99/)
  })

  it('formats zero', () => {
    const result = formatCurrency(0, 'GBP')
    expect(result).toMatch(/0/)
  })

  it('formats negative amounts', () => {
    const result = formatCurrency(-500, 'GBP')
    expect(result).toMatch(/500/)
  })

  it('reads currency from localStorage when none supplied', () => {
    localStorage.setItem('vaultly_currency', 'EUR')
    const result = formatCurrency(1000)
    expect(result).not.toMatch(/£/) // not GBP
  })

  it('falls back to GBP when localStorage is empty', () => {
    const result = formatCurrency(1000)
    expect(result).toMatch(/£/)
  })

  it('rounds to whole numbers (no pence)', () => {
    const result = formatCurrency(1000.99, 'GBP')
    expect(result).not.toMatch(/\./)
  })

  it('handles large amounts with correct separators', () => {
    const result = formatCurrency(1_000_000, 'GBP')
    expect(result).toMatch(/1,000,000/)
  })
})

// ── formatDate() ─────────────────────────────────────────────────────────────
describe('formatDate()', () => {
  it('formats a valid ISO date string', () => {
    const result = formatDate('2024-06-15')
    expect(result).toMatch(/2024/)
    expect(result).toMatch(/Jun/)
    expect(result).toMatch(/15/)
  })

  it('formats a Date object', () => {
    const result = formatDate(new Date('2024-01-01'))
    expect(result).toMatch(/2024/)
    expect(result).toMatch(/Jan/)
  })

  it('returns N/A for empty string', () => {
    expect(formatDate('')).toBe('N/A')
  })

  it('returns N/A for an invalid date string', () => {
    expect(formatDate('not-a-date')).toBe('N/A')
  })

  it('formats correctly for leap year', () => {
    const result = formatDate('2024-02-29')
    expect(result).toMatch(/Feb/)
    expect(result).toMatch(/29/)
  })
})

// ── getDaysUntil() ───────────────────────────────────────────────────────────
describe('getDaysUntil()', () => {
  it('returns a positive number for a future date', () => {
    const future = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
    const result = getDaysUntil(future)
    expect(result).toBeGreaterThan(0)
    expect(result).toBeLessThanOrEqual(8)
  })

  it('returns a negative number for a past date', () => {
    const past = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
    expect(getDaysUntil(past)).toBeLessThan(0)
  })

  it('returns roughly 0 for today', () => {
    const today = new Date().toISOString()
    const result = getDaysUntil(today)
    expect(result).toBeGreaterThanOrEqual(0)
    expect(result).toBeLessThanOrEqual(1)
  })

  it('returns 999 for empty string', () => {
    expect(getDaysUntil('')).toBe(999)
  })

  it('returns 999 for invalid date', () => {
    expect(getDaysUntil('bad-date')).toBe(999)
  })

  it('accepts a Date object', () => {
    const future = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000)
    const result = getDaysUntil(future)
    expect(result).toBeGreaterThan(8)
    expect(result).toBeLessThanOrEqual(11)
  })
})

// ── getInitials() ────────────────────────────────────────────────────────────
describe('getInitials()', () => {
  it('returns two uppercase initials for a full name', () => {
    expect(getInitials('John Smith')).toBe('JS')
  })

  it('returns one initial for a single name', () => {
    expect(getInitials('Alice')).toBe('A')
  })

  it('truncates to 2 characters for a long name', () => {
    expect(getInitials('Alice Bob Charlie')).toBe('AB')
  })

  it('uppercases lowercase input', () => {
    expect(getInitials('james bond')).toBe('JB')
  })

  it('handles empty string without throwing', () => {
    expect(() => getInitials('')).not.toThrow()
  })
})
