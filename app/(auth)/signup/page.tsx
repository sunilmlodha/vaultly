'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { signIn } from 'next-auth/react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Vault, Mail, Lock, User, AlertCircle } from 'lucide-react'

const OAUTH_PROVIDERS = [
  {
    id: 'google',
    label: 'Sign up with Google',
    icon: (
      <svg viewBox="0 0 24 24" className="w-4 h-4" aria-hidden>
        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
      </svg>
    ),
  },
  {
    id: 'microsoft-entra-id',
    label: 'Sign up with Microsoft',
    icon: (
      <svg viewBox="0 0 24 24" className="w-4 h-4" aria-hidden>
        <path fill="#f25022" d="M1 1h10v10H1z" />
        <path fill="#00a4ef" d="M13 1h10v10H13z" />
        <path fill="#7fba00" d="M1 13h10v10H1z" />
        <path fill="#ffb900" d="M13 13h10v10H13z" />
      </svg>
    ),
  },
  {
    id: 'github',
    label: 'Sign up with GitHub',
    icon: (
      <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor" aria-hidden>
        <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
      </svg>
    ),
  },
  {
    id: 'facebook',
    label: 'Sign up with Facebook',
    icon: (
      <svg viewBox="0 0 24 24" className="w-4 h-4" fill="#1877F2" aria-hidden>
        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
      </svg>
    ),
  },
]

export default function SignupPage() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [oauthLoading, setOauthLoading] = useState<string | null>(null)
  const router = useRouter()

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const res = await fetch('/api/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, full_name: name }),
    })

    const data = await res.json()
    if (!res.ok) {
      setError(data.error)
      setLoading(false)
      return
    }

    await signIn('credentials', { email, password, redirect: false })
    router.push('/dashboard')
  }

  const handleOAuth = async (provider: string) => {
    setOauthLoading(provider)
    await signIn(provider, { callbackUrl: '/dashboard' })
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-indigo-500 mb-4 shadow-lg shadow-indigo-200">
            <Vault size={24} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-slate-800">Create your vault</h1>
          <p className="text-slate-500 text-sm mt-1">Free to start — no credit card needed</p>
        </div>

        <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/60 p-7 border border-slate-100 space-y-5">
          {/* OAuth buttons */}
          <div className="space-y-2">
            {OAUTH_PROVIDERS.map(p => (
              <button
                key={p.id}
                onClick={() => handleOAuth(p.id)}
                disabled={oauthLoading !== null}
                className="w-full flex items-center justify-center gap-2.5 px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-all disabled:opacity-60"
              >
                {oauthLoading === p.id ? (
                  <span className="w-4 h-4 rounded-full border-2 border-slate-300 border-t-indigo-500 animate-spin" />
                ) : (
                  p.icon
                )}
                {p.label}
              </button>
            ))}
          </div>

          {/* Divider */}
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-slate-100" />
            <span className="text-xs text-slate-400 font-medium">or with email</span>
            <div className="flex-1 h-px bg-slate-100" />
          </div>

          {/* Credentials form */}
          <form onSubmit={handleSignup} className="space-y-4">
            <Input
              label="Full name"
              type="text"
              placeholder="Jane Smith"
              value={name}
              onChange={e => setName(e.target.value)}
              icon={<User size={15} />}
              required
            />
            <Input
              label="Email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              icon={<Mail size={15} />}
              required
            />
            <Input
              label="Password"
              type="password"
              placeholder="At least 8 characters"
              value={password}
              onChange={e => setPassword(e.target.value)}
              icon={<Lock size={15} />}
              minLength={8}
              required
            />
            {error && (
              <p className="text-xs text-red-600 bg-red-50 px-3 py-2 rounded-lg flex items-center gap-2">
                <AlertCircle size={12} /> {error}
              </p>
            )}
            <Button type="submit" className="w-full mt-1" size="lg" loading={loading}>
              Create free account
            </Button>
          </form>

          <p className="text-center text-sm text-slate-500">
            Already have an account?{' '}
            <Link href="/login" className="text-indigo-500 font-semibold hover:text-indigo-600">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
