'use client'
import { NextIntlClientProvider } from 'next-intl'
import { useEffect, useState } from 'react'
import type { Locale } from '@/lib/i18n'

// English messages imported statically — always available, no async wait on default locale.
import enMessages from '../messages/en.json'

// Static map so webpack/turbopack can bundle ALL locale files at build time.
// A dynamic string like import(`../messages/${locale}.json`) is NOT statically
// analysable and silently produces an empty chunk in production.
const LOCALE_LOADERS: Partial<Record<Locale, () => Promise<{ default: Record<string, unknown> }>>> = {
  de: () => import('../messages/de.json'),
  fr: () => import('../messages/fr.json'),
  hi: () => import('../messages/hi.json'),
}

export function I18nProvider({ children }: { children: React.ReactNode }) {
  // Start with English so NextIntlClientProvider is ALWAYS present from first render.
  const [locale, setLocale]     = useState<Locale>('en')
  const [messages, setMessages] = useState<Record<string, unknown>>(enMessages as Record<string, unknown>)

  useEffect(() => {
    const stored = (localStorage.getItem('vaultly_lang') || 'en') as Locale
    if (stored === 'en' || !LOCALE_LOADERS[stored]) {
      setLocale('en')
      setMessages(enMessages as Record<string, unknown>)
      return
    }
    setLocale(stored)
    LOCALE_LOADERS[stored]!()
      .then(m => setMessages(m.default))
      .catch(() => {
        setLocale('en')
        setMessages(enMessages as Record<string, unknown>)
      })
  }, [])

  return (
    <NextIntlClientProvider locale={locale} messages={messages} timeZone="UTC">
      {children}
    </NextIntlClientProvider>
  )
}
