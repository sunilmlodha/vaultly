'use client'
import { useEffect, useState } from 'react'
import { Bell, BellOff, X } from 'lucide-react'

export function PushPermissionBanner() {
  const [show, setShow] = useState(false)
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState<'idle' | 'granted' | 'denied'>('idle')

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return
    if (Notification.permission === 'granted') return
    if (Notification.permission === 'denied') return
    if (localStorage.getItem('push_dismissed')) return

    // Show banner after 5 seconds on first visit
    const t = setTimeout(() => setShow(true), 5000)
    return () => clearTimeout(t)
  }, [])

  const enable = async () => {
    setLoading(true)
    try {
      const permission = await Notification.requestPermission()
      if (permission !== 'granted') {
        setStatus('denied')
        setLoading(false)
        return
      }

      const reg = await navigator.serviceWorker.register('/sw.js')
      await navigator.serviceWorker.ready

      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(
          process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? ''
        ) as unknown as ArrayBuffer,
      })

      await fetch('/api/notifications/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sub.toJSON()),
      })

      setStatus('granted')
      setShow(false)
    } catch (err) {
      console.error('[push]', err)
    }
    setLoading(false)
  }

  const dismiss = () => {
    localStorage.setItem('push_dismissed', '1')
    setShow(false)
  }

  if (!show) return null

  return (
    <div className="fixed bottom-24 md:bottom-6 left-4 right-4 md:left-auto md:right-6 md:w-80 bg-white rounded-2xl shadow-2xl shadow-slate-200/80 border border-slate-100 p-4 z-40 animate-slide-up">
      <div className="flex gap-3">
        <div className="w-10 h-10 rounded-2xl bg-indigo-100 flex items-center justify-center shrink-0">
          <Bell size={18} className="text-indigo-600" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-semibold text-slate-800">Stay on top of your wealth</p>
          <p className="text-xs text-slate-500 mt-0.5 leading-snug">
            Get notified about renewal alerts, Vault Score changes, and your monthly story.
          </p>
          <div className="flex gap-2 mt-3">
            <button
              onClick={enable}
              disabled={loading}
              className="flex-1 py-2 bg-indigo-500 hover:bg-indigo-600 text-white text-xs font-semibold rounded-xl transition-colors disabled:opacity-60"
            >
              {loading ? 'Enabling…' : 'Enable alerts'}
            </button>
            <button
              onClick={dismiss}
              className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-medium rounded-xl transition-colors"
            >
              Later
            </button>
          </div>
        </div>
        <button onClick={dismiss} className="shrink-0 p-1 hover:bg-slate-100 rounded-lg">
          <X size={13} className="text-slate-400" />
        </button>
      </div>
    </div>
  )
}

// Helper — convert base64 VAPID public key to Uint8Array
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  return Uint8Array.from([...rawData].map(c => c.charCodeAt(0)))
}
