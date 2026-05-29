'use client'
import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Topbar } from '@/components/layout/topbar'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Lock, Fingerprint, CheckCircle, ArrowLeft, Delete, AlertCircle, Trash2,
} from 'lucide-react'
import {
  setPin, isPinSet, isBiometricRegistered, webAuthnSupported,
  registerBiometric, clearLockCredentials,
} from '@/hooks/use-app-lock'

const PAD = ['1','2','3','4','5','6','7','8','9','','0','⌫']

type Stage = 'overview' | 'set-pin' | 'confirm-pin' | 'done'

export default function LockSettingsPage() {
  const { data: session } = useSession()
  const router = useRouter()

  const [stage, setStage]           = useState<Stage>('overview')
  const [pin, setPin_]              = useState('')
  const [confirmPin, setConfirmPin] = useState('')
  const [entryState, setEntryState] = useState<'first' | 'confirm'>('first')
  const [firstPin, setFirstPin]     = useState('')
  const [error, setError]           = useState('')
  const [pinActive, setPinActive]   = useState(false)
  const [bioActive, setBioActive]   = useState(false)
  const [enrollingBio, setEnrollingBio] = useState(false)

  useEffect(() => {
    setPinActive(isPinSet())
    setBioActive(isBiometricRegistered())
    setPin_('')
    setConfirmPin('')
  }, [])

  const pressDigit = async (digit: string, current: string, setter: (v: string) => void, onComplete: (v: string) => void) => {
    if (digit === '⌫') { setter(current.slice(0, -1)); setError(''); return }
    if (digit === '' || current.length >= 6) return
    const next = current + digit
    setter(next)
    if (next.length === 6) onComplete(next)
  }

  const onFirstPinComplete = (v: string) => {
    setFirstPin(v)
    setPin_('')
    setEntryState('confirm')
    setError('')
  }

  const onConfirmPinComplete = async (v: string) => {
    if (v !== firstPin) {
      setError('PINs do not match — try again')
      setPin_('')
      setEntryState('first')
      setFirstPin('')
      return
    }
    await setPin(v)
    setPinActive(true)
    setStage('done')
  }

  const removeLock = () => {
    clearLockCredentials()
    setPinActive(false)
    setBioActive(false)
  }

  const enrollBiometric = async () => {
    setEnrollingBio(true)
    setError('')
    const credId = await registerBiometric(session?.user?.email || 'user')
    setEnrollingBio(false)
    if (credId) {
      setBioActive(true)
    } else {
      setError('Biometric enrolment failed — ensure Face ID / Touch ID is set up on your device')
    }
  }

  const removeBiometric = () => {
    localStorage.removeItem('vaultly_cred_id')
    setBioActive(false)
  }

  // ── PIN entry pad (reusable) ──────────────────────────────────────────────
  const currentValue = entryState === 'first' ? pin : confirmPin
  const currentSetter = entryState === 'first' ? setPin_ : setConfirmPin
  const onComplete = entryState === 'first' ? onFirstPinComplete : onConfirmPinComplete

  if (stage === 'set-pin') {
    return (
      <div>
        <Topbar title="Set PIN" subtitle="Choose a 6-digit lock code" userName={session?.user?.name ?? ''}
          actions={<Button variant="ghost" size="sm" onClick={() => { setStage('overview'); setPin_(''); setEntryState('first'); setFirstPin('') }}><ArrowLeft size={14} /> Back</Button>} />
        <div className="p-4 md:p-8 max-w-sm mx-auto flex flex-col items-center gap-6 animate-fade-in">
          <p className="text-sm font-medium text-slate-600 text-center">
            {entryState === 'first' ? 'Enter a 6-digit PIN' : 'Confirm your PIN'}
          </p>
          {/* Dots */}
          <div className="flex gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className={`w-4 h-4 rounded-full border-2 transition-all ${
                i < currentValue.length ? 'bg-indigo-500 border-indigo-500 scale-110' : 'bg-transparent border-slate-300'
              }`} />
            ))}
          </div>
          {error && (
            <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 border border-red-100 px-4 py-2 rounded-xl">
              <AlertCircle size={13} /> {error}
            </div>
          )}
          {/* Pad */}
          <div className="grid grid-cols-3 gap-3 w-64">
            {PAD.map((d, i) => (
              <button key={i} onClick={() => pressDigit(d, currentValue, currentSetter, onComplete)}
                disabled={d === ''}
                className={`h-14 rounded-2xl text-lg font-semibold transition-all ${
                  d === '' ? 'cursor-default' :
                  d === '⌫' ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 active:scale-95' :
                  'bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 active:scale-95'
                }`}
              >
                {d === '⌫' ? <Delete size={18} className="mx-auto" /> : d}
              </button>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (stage === 'done') {
    return (
      <div>
        <Topbar title="App Lock" subtitle="Secure your Vaultly" userName={session?.user?.name ?? ''} />
        <div className="p-4 md:p-8 max-w-sm mx-auto flex flex-col items-center gap-6 animate-fade-in">
          <div className="w-16 h-16 rounded-2xl bg-emerald-100 flex items-center justify-center">
            <CheckCircle size={32} className="text-emerald-500" />
          </div>
          <div className="text-center">
            <p className="font-bold text-slate-800 text-lg">PIN set</p>
            <p className="text-sm text-slate-500 mt-1">Vaultly will lock after 5 minutes of inactivity</p>
          </div>
          {webAuthnSupported() && !bioActive && (
            <Button onClick={enrollBiometric} loading={enrollingBio} className="w-full">
              <Fingerprint size={16} /> Also enable Face ID / Touch ID
            </Button>
          )}
          {bioActive && (
            <p className="text-sm text-emerald-600 flex items-center gap-2">
              <CheckCircle size={14} /> Biometrics enrolled
            </p>
          )}
          {error && <p className="text-sm text-red-600">{error}</p>}
          <Button variant="secondary" onClick={() => router.push('/settings')} className="w-full">Done</Button>
        </div>
      </div>
    )
  }

  // Overview
  return (
    <div>
      <Topbar title="App Lock" subtitle="PIN and biometric settings" userName={session?.user?.name ?? ''}
        actions={<Button variant="ghost" size="sm" onClick={() => router.push('/settings')}><ArrowLeft size={14} /> Back</Button>} />
      <div className="p-4 md:p-8 max-w-2xl mx-auto space-y-4 animate-fade-in">

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Lock size={16} className="text-indigo-500" /> PIN lock
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-slate-600">
              Set a 6-digit PIN to lock Vaultly. The app locks automatically after 5 minutes of inactivity or when you switch apps.
            </p>
            {pinActive ? (
              <div className="flex items-center justify-between bg-emerald-50 border border-emerald-100 rounded-xl px-4 py-3">
                <div className="flex items-center gap-2">
                  <CheckCircle size={15} className="text-emerald-500" />
                  <span className="text-sm font-medium text-emerald-700">PIN is active</span>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="secondary" onClick={() => { setStage('set-pin'); setEntryState('first'); setPin_('') }}>Change</Button>
                  <Button size="sm" variant="secondary" onClick={removeLock} className="text-red-600 hover:bg-red-50">
                    <Trash2 size={12} /> Remove
                  </Button>
                </div>
              </div>
            ) : (
              <Button onClick={() => { setStage('set-pin'); setEntryState('first') }}>
                <Lock size={14} /> Set PIN
              </Button>
            )}
          </CardContent>
        </Card>

        {webAuthnSupported() && pinActive && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Fingerprint size={16} className="text-indigo-500" /> Biometrics
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-slate-600">
                Use Face ID or Touch ID instead of your PIN. Requires PIN as fallback.
              </p>
              {bioActive ? (
                <div className="flex items-center justify-between bg-emerald-50 border border-emerald-100 rounded-xl px-4 py-3">
                  <div className="flex items-center gap-2">
                    <CheckCircle size={15} className="text-emerald-500" />
                    <span className="text-sm font-medium text-emerald-700">Biometrics enrolled</span>
                  </div>
                  <Button size="sm" variant="secondary" onClick={removeBiometric} className="text-red-600 hover:bg-red-50">
                    <Trash2 size={12} /> Remove
                  </Button>
                </div>
              ) : (
                <Button onClick={enrollBiometric} loading={enrollingBio} variant="secondary">
                  <Fingerprint size={14} /> Enrol Face ID / Touch ID
                </Button>
              )}
              {error && <p className="text-sm text-red-600">{error}</p>}
            </CardContent>
          </Card>
        )}

        {!webAuthnSupported() && (
          <p className="text-xs text-slate-400 text-center px-4">
            Biometrics require a supported browser (Safari on iOS, Chrome on Android). They will be available in the native mobile app.
          </p>
        )}
      </div>
    </div>
  )
}
