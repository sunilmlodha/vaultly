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

// Suppress next-intl errors gracefully — return the key name as fallback
// so a missing/bad key never crashes the page.
function onIntlError(error: unknown) {
  // Only log in development; silently handle in production
  if (process.env.NODE_ENV === 'development') {
    console.warn('[i18n]', error)
  }
}

function getMessageFallback({ namespace, key }: { namespace?: string; key: string }): string {
  return namespace ? `${namespace}.${key}` : key
}

export function I18nProvider({ children }: { children: React.ReactNode }) {
  // Start with English so NextIntlClientProvider is ALWAYS present from first render.
  const [locale, setLocale]     = useState<Locale>('en')
  const [messages, setMessages] = useState<Record<string, unknown>>(enMessages as Record<string, unknown>)

  useEffect(() => {
    const stored = (localStorage.getItem('vaultly_lang') || 'en') as Locale
    if (stored === 'en' || !LOCALE_LOADERS[stored]) {
      // Already English — no state change needed (avoid unnecessary re-render)
      return
    }
    // Load locale messages then update BOTH locale + messages atomically.
    // Never set locale='de' while messages are still English — that intermediate
    // state can confuse next-intl and trigger a runtime crash.
    LOCALE_LOADERS[stored]!()
      .then(m => {
        setLocale(stored)
        setMessages(m.default as Record<string, unknown>)
      })
      .catch(() => {
        // Locale file failed to load — stay on English silently
      })
  }, [])

  return (
    <NextIntlClientProvider
      locale={locale}
      messages={messages}
      timeZone="UTC"
      onError={onIntlError}
      getMessageFallback={getMessageFallback}
    >
      {children}
    </NextIntlClientProvider>
  )
}
