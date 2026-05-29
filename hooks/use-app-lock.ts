'use client'
import { useState, useEffect, useCallback, useRef } from 'react'

const STORAGE_KEYS = {
  PIN_HASH:    'vaultly_pin_hash',
  CRED_ID:     'vaultly_cred_id',
  UNLOCKED_AT: 'vaultly_unlocked_at',
  LANG:        'vaultly_lang',
} as const

const INACTIVITY_MS = 5 * 60 * 1000 // 5 minutes

// ─── SHA-256 helper ───────────────────────────────────────────────────────────
async function sha256(text: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('')
}

// ─── WebAuthn helpers ─────────────────────────────────────────────────────────
export function webAuthnSupported(): boolean {
  return typeof window !== 'undefined' && !!window.PublicKeyCredential
}

export async function registerBiometric(userId: string): Promise<string | null> {
  if (!webAuthnSupported()) return null
  try {
    const cred = await navigator.credentials.create({
      publicKey: {
        challenge: crypto.getRandomValues(new Uint8Array(32)),
        rp: { name: 'Vaultly', id: window.location.hostname },
        user: {
          id: new TextEncoder().encode(userId),
          name: userId,
          displayName: 'Vaultly User',
        },
        pubKeyCredParams: [
          { type: 'public-key', alg: -7 },  // ES256
          { type: 'public-key', alg: -257 }, // RS256
        ],
        authenticatorSelection: {
          authenticatorAttachment: 'platform',
          userVerification: 'required',
          residentKey: 'preferred',
        },
        timeout: 60000,
      },
    }) as PublicKeyCredential | null
    if (!cred) return null
    const idB64 = btoa(String.fromCharCode(...new Uint8Array(cred.rawId)))
    localStorage.setItem(STORAGE_KEYS.CRED_ID, idB64)
    return idB64
  } catch {
    return null
  }
}

export async function verifyBiometric(): Promise<boolean> {
  if (!webAuthnSupported()) return false
  const storedIdB64 = localStorage.getItem(STORAGE_KEYS.CRED_ID)
  if (!storedIdB64) return false
  try {
    const idBytes = Uint8Array.from(atob(storedIdB64), c => c.charCodeAt(0))
    const result = await navigator.credentials.get({
      publicKey: {
        challenge: crypto.getRandomValues(new Uint8Array(32)),
        rpId: window.location.hostname,
        allowCredentials: [{ type: 'public-key', id: idBytes }],
        userVerification: 'required',
        timeout: 60000,
      },
    })
    return !!result
  } catch {
    return false
  }
}

// ─── PIN helpers ──────────────────────────────────────────────────────────────
export async function setPin(pin: string): Promise<void> {
  const hash = await sha256(pin + 'vaultly_salt_2025')
  localStorage.setItem(STORAGE_KEYS.PIN_HASH, hash)
}

export async function verifyPin(pin: string): Promise<boolean> {
  const stored = localStorage.getItem(STORAGE_KEYS.PIN_HASH)
  if (!stored) return false
  const hash = await sha256(pin + 'vaultly_salt_2025')
  return hash === stored
}

export function isPinSet(): boolean {
  return typeof window !== 'undefined' && !!localStorage.getItem(STORAGE_KEYS.PIN_HASH)
}

export function isBiometricRegistered(): boolean {
  return typeof window !== 'undefined' && !!localStorage.getItem(STORAGE_KEYS.CRED_ID)
}

export function clearLockCredentials(): void {
  localStorage.removeItem(STORAGE_KEYS.PIN_HASH)
  localStorage.removeItem(STORAGE_KEYS.CRED_ID)
}

// ─── Lock state hook ──────────────────────────────────────────────────────────
export function useAppLock() {
  const [locked, setLocked]       = useState(false)
  const [pinExists, setPinExists] = useState(false)
  const inactivityRef             = useRef<ReturnType<typeof setTimeout> | null>(null)

  const markUnlocked = useCallback(() => {
    sessionStorage.setItem(STORAGE_KEYS.UNLOCKED_AT, String(Date.now()))
    setLocked(false)
  }, [])

  const lock = useCallback(() => {
    if (isPinSet()) {
      sessionStorage.removeItem(STORAGE_KEYS.UNLOCKED_AT)
      setLocked(true)
    }
  }, [])

  const resetInactivityTimer = useCallback(() => {
    if (inactivityRef.current) clearTimeout(inactivityRef.current)
    inactivityRef.current = setTimeout(lock, INACTIVITY_MS)
  }, [lock])

  useEffect(() => {
    // Hydrate pin state
    setPinExists(isPinSet())

    if (!isPinSet()) return // No PIN set — never lock

    // Check if already unlocked this session
    const unlockedAt = sessionStorage.getItem(STORAGE_KEYS.UNLOCKED_AT)
    if (unlockedAt && Date.now() - Number(unlockedAt) < INACTIVITY_MS) {
      // Still within inactivity window — stay unlocked
      setLocked(false)
    } else if (unlockedAt) {
      // Session exists but timed out
      setLocked(true)
    } else {
      // Fresh load — lock
      setLocked(true)
    }
  }, [])

  useEffect(() => {
    if (!isPinSet()) return

    // Lock when app is backgrounded (mobile swipe away)
    const onVisibilityChange = () => {
      if (document.hidden) {
        // Mark the time we hid; lock when we come back if too long
        sessionStorage.setItem('vaultly_hidden_at', String(Date.now()))
      } else {
        const hiddenAt = sessionStorage.getItem('vaultly_hidden_at')
        if (hiddenAt && Date.now() - Number(hiddenAt) > 30_000) {
          // Hidden for more than 30s → lock
          lock()
        }
        sessionStorage.removeItem('vaultly_hidden_at')
      }
    }

    // Reset inactivity timer on user interaction
    const onActivity = () => resetInactivityTimer()
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart']

    document.addEventListener('visibilitychange', onVisibilityChange)
    events.forEach(e => document.addEventListener(e, onActivity, { passive: true }))
    resetInactivityTimer()

    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange)
      events.forEach(e => document.removeEventListener(e, onActivity))
      if (inactivityRef.current) clearTimeout(inactivityRef.current)
    }
  }, [lock, resetInactivityTimer])

  return { locked, pinExists, lock, markUnlocked, setPinExists }
}
