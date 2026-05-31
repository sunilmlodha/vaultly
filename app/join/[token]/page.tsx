'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Building2 } from 'lucide-react'

interface InviteInfo {
  valid: boolean
  orgName?: string
  role?: string
  reason?: string
}

interface PageProps {
  params: Promise<{ token: string }>
}

export default function JoinPage({ params }: PageProps) {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [token, setToken] = useState<string | null>(null)
  const [invite, setInvite] = useState<InviteInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [joining, setJoining] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    params.then(({ token: t }) => setToken(t))
  }, [params])

  useEffect(() => {
    if (!token) return
    fetch(`/api/join/${token}`)
      .then((r) => r.json())
      .then((data: InviteInfo) => {
        setInvite(data)
        setLoading(false)
      })
      .catch(() => {
        setInvite({ valid: false, reason: 'Failed to load invite. Please try again.' })
        setLoading(false)
      })
  }, [token])

  async function handleJoin() {
    if (!token) return
    setJoining(true)
    setError(null)
    try {
      const res = await fetch(`/api/join/${token}`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Something went wrong')
        return
      }
      router.push('/wellness')
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setJoining(false)
    }
  }

  if (loading || status === 'loading') {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-slate-500">Loading invite…</p>
        </div>
      </div>
    )
  }

  if (!invite?.valid) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-4">
        <div className="w-full max-w-sm bg-white border border-slate-200 rounded-2xl shadow-sm p-8 text-center space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-red-50 flex items-center justify-center mx-auto">
            <Building2 size={24} className="text-red-500" />
          </div>
          <h1 className="text-lg font-bold text-slate-800">Invite not valid</h1>
          <p className="text-sm text-slate-500">{invite?.reason || 'This invite link is invalid.'}</p>
          <Link
            href="/login"
            className="inline-block mt-2 text-sm font-medium text-indigo-600 hover:text-indigo-700 underline"
          >
            Back to login
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-white border border-slate-200 rounded-2xl shadow-sm p-8 text-center space-y-5">
        <div className="w-14 h-14 rounded-2xl bg-indigo-500 flex items-center justify-center mx-auto">
          <Building2 size={26} className="text-white" />
        </div>

        <div>
          <p className="text-sm text-slate-500 mb-1">You&apos;ve been invited to join</p>
          <h1 className="text-2xl font-bold text-slate-800">{invite.orgName}</h1>
          {invite.role && (
            <p className="text-xs text-slate-400 mt-1 capitalize">Role: {invite.role}</p>
          )}
        </div>

        {status === 'authenticated' ? (
          <div className="space-y-3">
            {error && (
              <p className="text-sm text-red-500 bg-red-50 rounded-xl px-3 py-2">{error}</p>
            )}
            <button
              onClick={handleJoin}
              disabled={joining}
              className="w-full py-3 rounded-xl bg-indigo-500 text-white text-sm font-semibold hover:bg-indigo-600 transition-all disabled:opacity-50"
            >
              {joining ? 'Joining…' : `Join ${invite.orgName}`}
            </button>
            <p className="text-xs text-slate-400">
              Signed in as <span className="font-medium">{session?.user?.email}</span>
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-slate-500">Sign in or create an account to accept this invite.</p>
            <Link
              href={`/signup?invite=${token}`}
              className="block w-full py-3 rounded-xl bg-indigo-500 text-white text-sm font-semibold hover:bg-indigo-600 transition-all text-center"
            >
              Create account
            </Link>
            <Link
              href={`/login?invite=${token}`}
              className="block w-full py-3 rounded-xl border border-slate-200 text-slate-700 text-sm font-semibold hover:bg-slate-50 transition-all text-center"
            >
              Sign in
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
