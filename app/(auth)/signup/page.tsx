'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { signIn } from 'next-auth/react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Vault, Mail, Lock, User } from 'lucide-react'

export default function SignupPage() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
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
    if (!res.ok) { setError(data.error); setLoading(false); return }

    // Auto sign-in after signup
    await signIn('credentials', { email, password, redirect: false })
    router.push('/dashboard')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-indigo-500 mb-4 shadow-lg shadow-indigo-200">
            <Vault size={24} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-slate-800">Create your vault</h1>
          <p className="text-slate-500 text-sm mt-1">Free to start — no credit card needed</p>
        </div>
        <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/60 p-7 border border-slate-100">
          <form onSubmit={handleSignup} className="space-y-4">
            <Input label="Full name" type="text" placeholder="Jane Smith" value={name}
              onChange={e => setName(e.target.value)} icon={<User size={15} />} required />
            <Input label="Email" type="email" placeholder="you@example.com" value={email}
              onChange={e => setEmail(e.target.value)} icon={<Mail size={15} />} required />
            <Input label="Password" type="password" placeholder="At least 8 characters" value={password}
              onChange={e => setPassword(e.target.value)} icon={<Lock size={15} />} minLength={8} required />
            {error && <p className="text-xs text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
            <Button type="submit" className="w-full mt-2" size="lg" loading={loading}>Create free account</Button>
          </form>
          <p className="text-center text-sm text-slate-500 mt-5">
            Already have an account?{' '}
            <Link href="/login" className="text-indigo-500 font-semibold hover:text-indigo-600">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
