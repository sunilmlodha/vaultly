'use client'
import { NextIntlClientProvider } from 'next-intl'
import { useEffect, useState } from 'react'
import type { Locale } from '@/lib/i18n'

// English messages imported statically — always available, no async needed for default locale.
// Other locales are lazy-loaded on first mount if a different locale is set.
import enMessages from '../messages/en.json'

export function I18nProvider({ children }: { children: React.ReactNode }) {
  // Start with English so there's ALWAYS a provider from the very first render.
  // useTranslations() in Sidebar/MobileNav will never see a missing provider.
  const [locale, setLocale]     = useState<Locale>('en')
  const [messages, setMessages] = useState<Record<string, unknown>>(enMessages as Record<string, unknown>)

  useEffect(() => {
    const stored = (localStorage.getItem('vaultly_lang') || 'en') as Locale
    if (stored === 'en') {
      // Already using English — nothing to load
      setLocale('en')
      return
    }
    setLocale(stored)
    import(`../messages/${stored}.json`)
      .then(m => setMessages(m.default as Record<string, unknown>))
      .catch(() => {
        // Fallback: stay on English
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
