'use client'
import { useState, useCallback, useEffect } from 'react'
import { Vault, Fingerprint, Delete, AlertCircle, Loader2 } from 'lucide-react'
import {
  verifyPin, verifyBiometric, isPinSet, isBiometricRegistered, webAuthnSupported,
} from '@/hooks/use-app-lock'

interface LockScreenProps {
  onUnlock: () => void
  userEmail?: string
}

const PAD = ['1','2','3','4','5','6','7','8','9','','0','⌫']

export function LockScreen({ onUnlock, userEmail }: LockScreenProps) {
  const [pin, setPin]           = useState('')
  const [error, setError]       = useState('')
  const [checking, setChecking] = useState(false)
  const [bioPending, setBioPending] = useState(false)
  const [attempts, setAttempts] = useState(0)
  const MAX_ATTEMPTS = 5

  // Auto-attempt biometrics on mount if registered
  useEffect(() => {
    if (isBiometricRegistered() && webAuthnSupported()) {
      tryBiometric()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const tryBiometric = useCallback(async () => {
    setBioPending(true)
    setError('')
    try {
      const ok = await verifyBiometric()
      if (ok) {
        onUnlock()
      } else {
        setError('Biometric not recognised — enter your PIN')
      }
    } catch {
      setError('Biometric failed — enter your PIN')
    } finally {
      setBioPending(false)
    }
  }, [onUnlock])

  const pressDigit = useCallback(async (digit: string) => {
    if (digit === '⌫') {
      setPin(p => p.slice(0, -1))
      setError('')
      return
    }
    if (digit === '') return
    if (attempts >= MAX_ATTEMPTS) return

    const next = pin + digit
    setPin(next)

    if (next.length === 6) {
      setChecking(true)
      setError('')
      const ok = await verifyPin(next)
      if (ok) {
        onUnlock()
      } else {
        const newAttempts = attempts + 1
        setAttempts(newAttempts)
        setError(
          newAttempts >= MAX_ATTEMPTS
            ? 'Too many attempts. Sign in again to reset.'
            : `Incorrect PIN (${MAX_ATTEMPTS - newAttempts} attempts left)`
        )
        setPin('')
      }
      setChecking(false)
    }
  }, [pin, attempts, onUnlock])

  const hasBio = isBiometricRegistered() && webAuthnSupported()
  const maskedEmail = userEmail
    ? userEmail.replace(/(.{2})(.*)(@.*)/, (_, a, _b, c) => a + '•'.repeat(4) + c)
    : ''

  return (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-gradient-to-b from-indigo-600 to-indigo-800 select-none">
      {/* Logo */}
      <div className="mb-8 flex flex-col items-center gap-3">
        <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center">
          <Vault size={32} className="text-white" />
        </div>
        <p className="text-white font-bold text-xl tracking-tight">Vaultly</p>
        {maskedEmail && <p className="text-white/60 text-sm">{maskedEmail}</p>}
      </div>

      {/* PIN dots */}
      <div className="flex gap-4 mb-8">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className={`w-4 h-4 rounded-full border-2 transition-all ${
              i < pin.length
                ? 'bg-white border-white scale-110'
                : 'bg-transparent border-white/40'
            }`}
          />
        ))}
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 text-red-200 text-sm mb-4 bg-red-500/20 px-4 py-2 rounded-xl">
          <AlertCircle size={14} />
          {error}
        </div>
      )}

      {checking && (
        <div className="mb-4">
          <Loader2 size={20} className="text-white/60 animate-spin" />
        </div>
      )}

      {/* Numpad */}
      <div className="grid grid-cols-3 gap-3 w-64">
        {PAD.map((d, i) => (
          <button
            key={i}
            onClick={() => pressDigit(d)}
            disabled={checking || attempts >= MAX_ATTEMPTS || d === ''}
            className={`
              h-16 rounded-2xl text-xl font-semibold text-white transition-all
              ${d === ''
                ? 'cursor-default'
                : d === '⌫'
                ? 'bg-white/10 hover:bg-white/20 active:scale-95'
                : 'bg-white/20 hover:bg-white/30 active:scale-95 active:bg-white/40'
              }
              disabled:opacity-40
            `}
          >
            {d === '⌫' ? <Delete size={20} className="mx-auto" /> : d}
          </button>
        ))}
      </div>

      {/* Biometric button */}
      {hasBio && !bioPending && attempts < MAX_ATTEMPTS && (
        <button
          onClick={tryBiometric}
          className="mt-8 flex items-center gap-2 text-white/80 hover:text-white text-sm font-medium transition-colors"
        >
          <Fingerprint size={20} />
          Use Face ID / Touch ID
        </button>
      )}
      {bioPending && (
        <div className="mt-8 flex items-center gap-2 text-white/60 text-sm">
          <Loader2 size={16} className="animate-spin" />
          Verifying biometric…
        </div>
      )}
    </div>
  )
}
