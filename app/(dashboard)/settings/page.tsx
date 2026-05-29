'use client'
import { useState, useEffect } from 'react'
import { useSession, signOut } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Topbar } from '@/components/layout/topbar'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  User, Globe, Shield, Trash2, LogOut, CheckCircle,
  AlertTriangle, ChevronRight, Lock, Download,
} from 'lucide-react'

const CURRENCIES = ['GBP', 'EUR', 'USD', 'INR', 'AED', 'SGD', 'AUD', 'CAD']

const LANGUAGES = [
  { code: 'en', label: 'English', flag: '🇬🇧' },
  { code: 'de', label: 'Deutsch', flag: '🇩🇪' },
  { code: 'fr', label: 'Français', flag: '🇫🇷' },
  { code: 'hi', label: 'हिंदी', flag: '🇮🇳' },
]

export default function SettingsPage() {
  const { data: session } = useSession()
  const router = useRouter()

  const [profile, setProfile] = useState({ full_name: '', email: '', currency: 'GBP', created_at: '' })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState('')
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [language, setLanguage] = useState('en')
  const [pinSet, setPinSet] = useState(false)

  useEffect(() => {
    // Pre-fill currency from localStorage immediately (no flash)
    if (typeof window !== 'undefined') {
      const savedCurrency = localStorage.getItem('vaultly_currency') || 'GBP'
      setProfile(p => ({ ...p, currency: savedCurrency }))
      setPinSet(!!localStorage.getItem('vaultly_pin_hash'))
      setLanguage(localStorage.getItem('vaultly_lang') || 'en')
    }
    // Then sync from DB (source of truth)
    fetch('/api/account').then(r => r.json()).then(({ account }) => {
      if (account) {
        setProfile({ full_name: account.full_name, email: account.email, currency: account.currency, created_at: account.created_at })
        // Keep localStorage in sync with DB
        if (typeof window !== 'undefined') {
          localStorage.setItem('vaultly_currency', account.currency)
        }
      }
    })
  }, [])

  const saveProfile = async () => {
    setSaving(true)
    await fetch('/api/account', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ full_name: profile.full_name, currency: profile.currency }),
    })
    // Write to localStorage — this is what formatCurrency() reads on every page
    // so ALL pages immediately use the new currency without needing a page reload.
    localStorage.setItem('vaultly_currency', profile.currency)
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const selectLanguage = (code: string) => {
    setLanguage(code)
    localStorage.setItem('vaultly_lang', code)
    // Reload to apply locale
    window.location.reload()
  }

  const deleteAccount = async () => {
    if (deleteConfirm.toLowerCase() !== 'delete my account') return
    setDeleting(true)
    const res = await fetch('/api/account', { method: 'DELETE' })
    if (res.ok) {
      await signOut({ redirect: false })
      router.push('/?deleted=1')
    } else {
      setDeleting(false)
      alert('Deletion failed — please try again or contact support.')
    }
  }

  return (
    <div>
      <Topbar title="Settings" subtitle="Account, security & preferences" userName={session?.user?.name ?? ''} />
      <div className="p-4 md:p-8 max-w-2xl mx-auto space-y-6 animate-fade-in">

        {/* Profile */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <User size={16} className="text-indigo-500" /> Profile
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              label="Full name"
              value={profile.full_name}
              onChange={e => setProfile(p => ({ ...p, full_name: e.target.value }))}
            />
            <Input label="Email address" value={profile.email} disabled />
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Default currency</label>
              <div className="flex flex-wrap gap-2">
                {CURRENCIES.map(c => (
                  <button
                    key={c}
                    onClick={() => setProfile(p => ({ ...p, currency: c }))}
                    className={`px-3 py-1.5 rounded-xl text-sm font-medium border transition-all ${
                      profile.currency === c
                        ? 'bg-indigo-500 text-white border-indigo-500'
                        : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-300'
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>
            {profile.created_at && (
              <p className="text-xs text-slate-400">Account created {new Date(profile.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
            )}
            <Button onClick={saveProfile} loading={saving} size="sm">
              {saved ? <><CheckCircle size={13} /> Saved</> : 'Save changes'}
            </Button>
          </CardContent>
        </Card>

        {/* Language */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Globe size={16} className="text-indigo-500" /> Language
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-2">
              {LANGUAGES.map(l => (
                <button
                  key={l.code}
                  onClick={() => selectLanguage(l.code)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl border text-sm font-medium transition-all ${
                    language === l.code
                      ? 'bg-indigo-50 border-indigo-300 text-indigo-700'
                      : 'bg-white border-slate-200 text-slate-600 hover:border-indigo-200'
                  }`}
                >
                  <span className="text-xl">{l.flag}</span>
                  {l.label}
                  {language === l.code && <CheckCircle size={14} className="ml-auto text-indigo-500" />}
                </button>
              ))}
            </div>
            <p className="text-xs text-slate-400 mt-3">More languages coming soon. Community translations welcome.</p>
          </CardContent>
        </Card>

        {/* Security */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Shield size={16} className="text-indigo-500" /> Security
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <button
              onClick={() => router.push('/settings/lock')}
              className="w-full flex items-center gap-3 px-4 py-3 bg-slate-50 hover:bg-slate-100 rounded-xl border border-slate-200 transition-all text-left"
            >
              <Lock size={16} className="text-slate-500" />
              <div className="flex-1">
                <p className="text-sm font-medium text-slate-700">App lock</p>
                <p className="text-xs text-slate-400">{pinSet ? 'PIN set — biometrics available' : 'Set a PIN to lock the app'}</p>
              </div>
              <ChevronRight size={16} className="text-slate-400" />
            </button>
            <button
              onClick={() => signOut({ callbackUrl: '/' })}
              className="w-full flex items-center gap-3 px-4 py-3 bg-slate-50 hover:bg-slate-100 rounded-xl border border-slate-200 transition-all text-left"
            >
              <LogOut size={16} className="text-slate-500" />
              <div className="flex-1">
                <p className="text-sm font-medium text-slate-700">Sign out</p>
                <p className="text-xs text-slate-400">Sign out from all devices</p>
              </div>
              <ChevronRight size={16} className="text-slate-400" />
            </button>
          </CardContent>
        </Card>

        {/* GDPR Data Export */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Download size={16} className="text-indigo-500" /> Your Data
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-slate-600">
              Download a complete export of all your Vaultly data — assets, liabilities, transactions, goals, renewals, and documents metadata.
            </p>
            <p className="text-xs text-slate-400">Your right under UK GDPR Art. 20 / EU GDPR Art. 20 / India DPDP Act 2023 S.12 (data portability).</p>
            <a href="/api/account/export" download>
              <Button variant="outline" size="sm" className="text-indigo-600 border-indigo-200 hover:bg-indigo-50">
                <Download size={13} /> Download my data (JSON)
              </Button>
            </a>
          </CardContent>
        </Card>

        {/* Danger zone */}
        <Card className="border-red-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2 text-red-600">
              <Trash2 size={16} /> Danger zone
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-slate-600">
              Permanently delete your account and all associated data — assets, transactions, documents, goals, and connected banks. This action cannot be undone.
            </p>
            <p className="text-xs text-slate-400">Your rights: you can request data deletion at any time under UK GDPR Article 17, EU GDPR Article 17, and India DPDP Act 2023 Section 12.</p>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setShowDeleteModal(true)}
              className="text-red-600 border-red-200 hover:bg-red-50"
            >
              <Trash2 size={13} /> Delete my account &amp; all data
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Delete confirmation modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                <AlertTriangle size={18} className="text-red-600" />
              </div>
              <div>
                <h2 className="font-bold text-slate-800">Delete account?</h2>
                <p className="text-sm text-slate-500">This cannot be undone.</p>
              </div>
            </div>
            <p className="text-sm text-slate-600">
              All your data will be permanently deleted: assets, liabilities, transactions, documents, goals, renewals, and bank connections.
            </p>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Type <span className="font-mono bg-slate-100 px-1 rounded">delete my account</span> to confirm
              </label>
              <input
                type="text"
                value={deleteConfirm}
                onChange={e => setDeleteConfirm(e.target.value)}
                placeholder="delete my account"
                className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
              />
            </div>
            <div className="flex gap-3">
              <Button variant="secondary" onClick={() => { setShowDeleteModal(false); setDeleteConfirm('') }} className="flex-1">
                Cancel
              </Button>
              <Button
                onClick={deleteAccount}
                loading={deleting}
                disabled={deleteConfirm.toLowerCase() !== 'delete my account'}
                className="flex-1 bg-red-600 hover:bg-red-700"
              >
                <Trash2 size={13} /> Delete everything
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
