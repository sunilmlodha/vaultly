'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Topbar } from '@/components/layout/topbar'
import { Landmark, Loader2 } from 'lucide-react'

interface FormState {
  name: string
  pension_provider: string
  pension_match_pct: string
  pension_max_match_pct: string
  salary_sacrifice_enabled: boolean
  share_scheme_name: string
}

export default function EnterpriseSetupPage() {
  const router = useRouter()

  const [form, setForm] = useState<FormState>({
    name: '',
    pension_provider: '',
    pension_match_pct: '',
    pension_max_match_pct: '',
    salary_sacrifice_enabled: false,
    share_scheme_name: '',
  })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target
    setForm(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim()) {
      setError('Company name is required.')
      return
    }
    setError(null)
    setSubmitting(true)

    try {
      const body: Record<string, unknown> = {
        name: form.name.trim(),
        salary_sacrifice_enabled: form.salary_sacrifice_enabled,
      }
      if (form.pension_provider.trim()) body.pension_provider = form.pension_provider.trim()
      if (form.pension_match_pct !== '') body.pension_match_pct = Number(form.pension_match_pct)
      if (form.pension_max_match_pct !== '') body.pension_max_match_pct = Number(form.pension_max_match_pct)
      if (form.share_scheme_name.trim()) body.share_scheme_name = form.share_scheme_name.trim()

      const res = await fetch('/api/organisations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (!res.ok) {
        const { error: msg } = await res.json().catch(() => ({}))
        throw new Error(msg || 'Failed to create organisation.')
      }

      router.push('/enterprise')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.')
      setSubmitting(false)
    }
  }

  return (
    <div>
      <Topbar title="Set up your organisation" subtitle="Create your company workspace" />

      <div className="p-4 md:p-8 flex justify-center">
        <div className="w-full max-w-lg">
          <Card>
            <CardHeader className="pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center shrink-0">
                  <Landmark size={20} className="text-indigo-500" />
                </div>
                <div>
                  <CardTitle className="text-lg">Organisation details</CardTitle>
                  <p className="text-xs text-slate-500 mt-0.5">This can be updated later in settings.</p>
                </div>
              </div>
            </CardHeader>

            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-5">

                {/* Company name */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    Company name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={form.name}
                    onChange={handleChange}
                    placeholder="Acme Ltd"
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 transition"
                    required
                  />
                </div>

                {/* Pension provider */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    Pension provider
                    <span className="ml-1 text-xs text-slate-400 font-normal">(optional)</span>
                  </label>
                  <input
                    type="text"
                    name="pension_provider"
                    value={form.pension_provider}
                    onChange={handleChange}
                    placeholder="e.g. Nest, Scottish Widows"
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 transition"
                  />
                </div>

                {/* Employer match + Max match */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">
                      Employer match %
                      <span className="ml-1 text-xs text-slate-400 font-normal">(optional)</span>
                    </label>
                    <input
                      type="number"
                      name="pension_match_pct"
                      value={form.pension_match_pct}
                      onChange={handleChange}
                      placeholder="e.g. 5"
                      min="0"
                      max="100"
                      step="0.1"
                      className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 transition"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">
                      Max match %
                      <span className="ml-1 text-xs text-slate-400 font-normal">(optional)</span>
                    </label>
                    <input
                      type="number"
                      name="pension_max_match_pct"
                      value={form.pension_max_match_pct}
                      onChange={handleChange}
                      placeholder="e.g. 10"
                      min="0"
                      max="100"
                      step="0.1"
                      className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 transition"
                    />
                  </div>
                </div>

                {/* Salary sacrifice toggle */}
                <div className="flex items-center justify-between rounded-xl border border-slate-200 px-4 py-3">
                  <div>
                    <p className="text-sm font-medium text-slate-700">Salary sacrifice</p>
                    <p className="text-xs text-slate-400 mt-0.5">Enable pension salary sacrifice scheme</p>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={form.salary_sacrifice_enabled}
                    onClick={() => setForm(prev => ({ ...prev, salary_sacrifice_enabled: !prev.salary_sacrifice_enabled }))}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-300 ${
                      form.salary_sacrifice_enabled ? 'bg-indigo-600' : 'bg-slate-200'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                        form.salary_sacrifice_enabled ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>

                {/* Share scheme name */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    Share scheme name
                    <span className="ml-1 text-xs text-slate-400 font-normal">(optional)</span>
                  </label>
                  <input
                    type="text"
                    name="share_scheme_name"
                    value={form.share_scheme_name}
                    onChange={handleChange}
                    placeholder="e.g. EMI, CSOP, SAYE"
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 transition"
                  />
                </div>

                {/* Error */}
                {error && (
                  <div className="rounded-xl bg-rose-50 border border-rose-100 px-4 py-3 text-sm text-rose-700">
                    {error}
                  </div>
                )}

                {/* Submit */}
                <div className="flex items-center gap-3 pt-2">
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 disabled:opacity-60 transition-all"
                  >
                    {submitting && <Loader2 size={14} className="animate-spin" />}
                    {submitting ? 'Creating…' : 'Create organisation'}
                  </button>
                  <button
                    type="button"
                    onClick={() => router.back()}
                    disabled={submitting}
                    className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm font-medium hover:bg-slate-50 disabled:opacity-50 transition-all"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
