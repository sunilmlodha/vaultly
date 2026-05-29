'use client'
import { NextIntlClientProvider } from 'next-intl'
import { useEffect, useState } from 'react'
import type { Locale } from '@/lib/i18n'

// Dynamically load the correct message bundle based on localStorage
export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocale]     = useState<Locale>('en')
  const [messages, setMessages] = useState<Record<string, unknown>>({})
  const [ready, setReady]       = useState(false)

  useEffect(() => {
    const stored = (localStorage.getItem('vaultly_lang') || 'en') as Locale
    setLocale(stored)

    import(`../messages/${stored}.json`)
      .then(m => {
        setMessages(m.default)
        setReady(true)
      })
      .catch(() => {
        // Fallback to English
        import('../messages/en.json').then(m => {
          setMessages(m.default)
          setReady(true)
        })
      })
  }, [])

  if (!ready) return <>{children}</> // render without translations while loading

  return (
    <NextIntlClientProvider locale={locale} messages={messages} timeZone="UTC">
      {children}
    </NextIntlClientProvider>
  )
}
