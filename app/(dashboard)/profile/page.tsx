'use client'
import { useState, useEffect, useRef } from 'react'
import { useSession } from 'next-auth/react'
import { Topbar } from '@/components/layout/topbar'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  User, Camera, CheckCircle, Trash2, Bell, Link2,
  Smartphone, Calendar, AlignLeft, Shield,
} from 'lucide-react'

interface ConnectedProvider {
  provider: string
  connected_at: string
}

interface Profile {
  id: string
  email: string
  full_name: string
  avatar_url: string | null
  phone: string | null
  bio: string | null
  date_of_birth: string | null
  notification_prefs: Record<string, boolean>
  currency: string
  household_id: string
  created_at: string
  connected_providers: ConnectedProvider[]
}

const PROVIDER_META: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  google: {
    label: 'Google',
    color: 'bg-red-50 border-red-200 text-red-700',
    icon: (
      <svg viewBox="0 0 24 24" className="w-4 h-4" aria-hidden>
        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
      </svg>
    ),
  },
  'microsoft-entra-id': {
    label: 'Microsoft',
    color: 'bg-blue-50 border-blue-200 text-blue-700',
    icon: (
      <svg viewBox="0 0 24 24" className="w-4 h-4" aria-hidden>
        <path fill="#f25022" d="M1 1h10v10H1z" />
        <path fill="#00a4ef" d="M13 1h10v10H13z" />
        <path fill="#7fba00" d="M1 13h10v10H1z" />
        <path fill="#ffb900" d="M13 13h10v10H13z" />
      </svg>
    ),
  },
  github: {
    label: 'GitHub',
    color: 'bg-slate-50 border-slate-200 text-slate-700',
    icon: (
      <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor" aria-hidden>
        <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
      </svg>
    ),
  },
  facebook: {
    label: 'Facebook',
    color: 'bg-blue-50 border-blue-200 text-blue-700',
    icon: (
      <svg viewBox="0 0 24 24" className="w-4 h-4" fill="#1877F2" aria-hidden>
        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
      </svg>
    ),
  },
}

const NOTIFICATION_OPTIONS = [
  { key: 'renewal_reminders', label: 'Renewal reminders', desc: 'Alerts 30, 14, and 7 days before renewals' },
  { key: 'goal_milestones', label: 'Goal milestones', desc: 'When you hit 25%, 50%, 75% and 100% of a goal' },
  { key: 'weekly_summary', label: 'Weekly summary', desc: 'Your net worth and spending recap every Monday' },
  { key: 'large_transactions', label: 'Large transactions', desc: 'Whenever a connected account shows a big move' },
  { key: 'security_alerts', label: 'Security alerts', desc: 'New device sign-in and suspicious activity' },
]

function getInitials(name: string): string {
  return name
    .split(' ')
    .map(n => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

export default function ProfilePage() {
  const { data: session } = useSession()
  const fileRef = useRef<HTMLInputElement>(null)

  const [profile, setProfile] = useState<Profile | null>(null)
  const [form, setForm] = useState({
    full_name: '',
    phone: '',
    bio: '',
    date_of_birth: '',
  })
  const [notifPrefs, setNotifPrefs] = useState<Record<string, boolean>>({})
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [avatarUploading, setAvatarUploading] = useState(false)
  const [avatarError, setAvatarError] = useState('')

  useEffect(() => {
    fetch('/api/profile')
      .then(r => r.json())
      .then(({ profile: p }: { profile: Profile }) => {
        setProfile(p)
        setForm({
          full_name: p.full_name || '',
          phone: p.phone || '',
          bio: p.bio || '',
          date_of_birth: p.date_of_birth || '',
        })
        // Defaults: security_alerts always on
        setNotifPrefs({
          renewal_reminders: true,
          goal_milestones: true,
          weekly_summary: false,
          large_transactions: true,
          security_alerts: true,
          ...p.notification_prefs,
        })
      })
  }, [])

  const saveProfile = async () => {
    setSaving(true)
    const res = await fetch('/api/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, notification_prefs: notifPrefs }),
    })
    if (res.ok) {
      const { profile: updated } = await res.json()
      setProfile(prev => prev ? { ...prev, ...updated } : prev)
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    }
    setSaving(false)
  }

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setAvatarUploading(true)
    setAvatarError('')

    const fd = new FormData()
    fd.append('avatar', file)
    const res = await fetch('/api/profile/avatar', { method: 'POST', body: fd })
    const data = await res.json()

    if (res.ok) {
      setProfile(prev => prev ? { ...prev, avatar_url: data.avatar_url } : prev)
    } else {
      setAvatarError(data.error || 'Upload failed')
    }
    setAvatarUploading(false)
    e.target.value = ''
  }

  const removeAvatar = async () => {
    await fetch('/api/profile/avatar', { method: 'DELETE' })
    setProfile(prev => prev ? { ...prev, avatar_url: null } : prev)
  }

  if (!profile) {
    return (
      <div>
        <Topbar title="Profile" subtitle="Your personal details" userName={session?.user?.name ?? ''} />
        <div className="p-8 flex justify-center">
          <div className="w-8 h-8 rounded-full border-2 border-indigo-200 border-t-indigo-500 animate-spin" />
        </div>
      </div>
    )
  }

  return (
    <div>
      <Topbar title="Profile" subtitle="Manage your personal details and preferences" userName={session?.user?.name ?? ''} />
      <div className="p-4 md:p-8 max-w-2xl mx-auto space-y-6 animate-fade-in">

        {/* ── Avatar ── */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <User size={16} className="text-indigo-500" /> Photo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-5">
              {/* Avatar display */}
              <div className="relative shrink-0">
                {profile.avatar_url ? (
                  <img
                    src={profile.avatar_url}
                    alt="Profile photo"
                    className="w-20 h-20 rounded-2xl object-cover border-2 border-slate-100"
                  />
                ) : (
                  <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-indigo-400 to-violet-500 flex items-center justify-center border-2 border-indigo-100">
                    <span className="text-2xl font-bold text-white">
                      {getInitials(profile.full_name || session?.user?.name || '?')}
                    </span>
                  </div>
                )}
                {avatarUploading && (
                  <div className="absolute inset-0 rounded-2xl bg-white/80 flex items-center justify-center">
                    <div className="w-5 h-5 rounded-full border-2 border-indigo-300 border-t-indigo-600 animate-spin" />
                  </div>
                )}
              </div>

              {/* Upload controls */}
              <div className="space-y-2">
                <p className="text-sm text-slate-500">JPEG, PNG or WebP · Max 5 MB</p>
                <div className="flex gap-2 flex-wrap">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => fileRef.current?.click()}
                    loading={avatarUploading}
                  >
                    <Camera size={13} /> Upload photo
                  </Button>
                  {profile.avatar_url && (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={removeAvatar}
                      className="text-red-500 border-red-200 hover:bg-red-50"
                    >
                      <Trash2 size={13} /> Remove
                    </Button>
                  )}
                </div>
                {avatarError && (
                  <p className="text-xs text-red-600">{avatarError}</p>
                )}
              </div>
            </div>
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="hidden"
              onChange={handleAvatarChange}
            />
          </CardContent>
        </Card>

        {/* ── Personal details ── */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <User size={16} className="text-indigo-500" /> Personal details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              label="Full name"
              value={form.full_name}
              onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))}
              icon={<User size={15} />}
            />
            <Input
              label="Email address"
              value={profile.email}
              disabled
              icon={<Shield size={15} />}
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Phone number"
                type="tel"
                placeholder="+44 7700 000000"
                value={form.phone}
                onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                icon={<Smartphone size={15} />}
              />
              <Input
                label="Date of birth"
                type="date"
                value={form.date_of_birth}
                onChange={e => setForm(f => ({ ...f, date_of_birth: e.target.value }))}
                icon={<Calendar size={15} />}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                <AlignLeft size={13} className="inline mr-1 text-slate-400" />
                Bio
              </label>
              <textarea
                className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-300 resize-none"
                rows={3}
                placeholder="A short note about yourself…"
                value={form.bio}
                onChange={e => setForm(f => ({ ...f, bio: e.target.value }))}
                maxLength={300}
              />
              <p className="text-xs text-slate-400 mt-1 text-right">{form.bio.length}/300</p>
            </div>
            <p className="text-xs text-slate-400">
              Member since {new Date(profile.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          </CardContent>
        </Card>

        {/* ── Notification preferences ── */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Bell size={16} className="text-indigo-500" /> Notifications
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {NOTIFICATION_OPTIONS.map(opt => (
              <div key={opt.key} className="flex items-center justify-between gap-4 py-1">
                <div>
                  <p className="text-sm font-medium text-slate-700">{opt.label}</p>
                  <p className="text-xs text-slate-400">{opt.desc}</p>
                </div>
                <button
                  role="switch"
                  aria-checked={!!notifPrefs[opt.key]}
                  onClick={() =>
                    setNotifPrefs(p => ({ ...p, [opt.key]: !p[opt.key] }))
                  }
                  className={`relative w-10 h-6 rounded-full transition-colors ${
                    notifPrefs[opt.key] ? 'bg-indigo-500' : 'bg-slate-200'
                  }`}
                >
                  <span
                    className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
                      notifPrefs[opt.key] ? 'translate-x-4' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* ── Connected accounts ── */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Link2 size={16} className="text-indigo-500" /> Connected accounts
            </CardTitle>
          </CardHeader>
          <CardContent>
            {profile.connected_providers.length === 0 ? (
              <p className="text-sm text-slate-500">
                No social accounts connected. Sign out and log back in with Google, Microsoft, GitHub or Facebook to link them.
              </p>
            ) : (
              <div className="space-y-2">
                {profile.connected_providers.map(cp => {
                  const meta = PROVIDER_META[cp.provider] ?? {
                    label: cp.provider,
                    color: 'bg-slate-50 border-slate-200 text-slate-700',
                    icon: <Link2 size={14} />,
                  }
                  return (
                    <div
                      key={cp.provider}
                      className={`flex items-center gap-3 px-4 py-3 rounded-xl border ${meta.color}`}
                    >
                      {meta.icon}
                      <div className="flex-1">
                        <p className="text-sm font-medium">{meta.label}</p>
                        <p className="text-xs opacity-70">
                          Connected{' '}
                          {new Date(cp.connected_at).toLocaleDateString('en-GB', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </p>
                      </div>
                      <CheckCircle size={15} className="opacity-60" />
                    </div>
                  )
                })}
              </div>
            )}
            <p className="text-xs text-slate-400 mt-3">
              Connecting multiple providers to the same email address merges them into one account.
            </p>
          </CardContent>
        </Card>

        {/* Save button */}
        <div className="pb-4">
          <Button onClick={saveProfile} loading={saving} size="lg" className="w-full sm:w-auto">
            {saved ? (
              <><CheckCircle size={14} /> Saved</>
            ) : (
              'Save changes'
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
