'use client'
import { useSearchParams, useRouter } from 'next/navigation'
import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { formatCurrency } from '@/lib/utils'
import { Loader2, CheckCircle2, AlertCircle, Building2, ArrowLeft } from 'lucide-react'
import type { TLAccount, AccountMapping } from '@/lib/types'

type Step = 'loading' | 'mapping' | 'saving' | 'done' | 'error'

interface CallbackResponse {
  accounts: TLAccount[]
  bank_name: string
  bank_logo_url: string | null
  bank_id: string
  encrypted_tokens: string
  consent_expires_at: string
  token_expires_at: string
}

const DECISION_OPTIONS = [
  { value: 'asset', label: 'Asset' },
  { value: 'liability', label: 'Liability' },
  { value: 'skip', label: 'Skip' },
]

const ASSET_CATEGORIES = [
  { value: 'bank_account', label: 'Bank Account' },
  { value: 'savings', label: 'Savings' },
  { value: 'investment', label: 'Investment' },
  { value: 'other', label: 'Other' },
]

const LIABILITY_CATEGORIES = [
  { value: 'credit_card', label: 'Credit Card' },
  { value: 'loan', label: 'Loan' },
  { value: 'mortgage', label: 'Mortgage' },
  { value: 'overdraft', label: 'Overdraft' },
  { value: 'other', label: 'Other' },
]

export function CallbackContent() {
  const searchParams = useSearchParams()
  const router = useRouter()

  const [step, setStep] = useState<Step>('loading')
  const [error, setError] = useState<string | null>(null)
  const [accountsData, setAccountsData] = useState<CallbackResponse | null>(null)
  const [mappings, setMappings] = useState<AccountMapping[]>([])

  useEffect(() => {
    const code = searchParams.get('code')
    const state = searchParams.get('state')
    const errorParam = searchParams.get('error')

    if (errorParam) {
      setError(errorParam)
      setStep('error')
      return
    }

    if (!code || !state) {
      setError('Missing authorisation code or state parameter.')
      setStep('error')
      return
    }

    fetch('/api/connections/callback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, state }),
    })
      .then(async (res) => {
        const data = await res.json()
        if (!res.ok || data.error) {
          throw new Error(data.error || 'Failed to exchange code')
        }
        return data as CallbackResponse
      })
      .then((data) => {
        setAccountsData(data)
        setMappings(
          data.accounts.map((acc) => ({
            external_account_id: acc.account_id,
            account_type: acc.account_type,
            account_name: acc.display_name,
            currency: acc.currency,
            balance: acc.balance ?? 0,
            decision: acc.side ?? 'asset',
            category: acc.category ?? 'bank_account',
          }))
        )
        setStep('mapping')
      })
      .catch((err) => {
        setError(err.message || 'Something went wrong connecting your bank.')
        setStep('error')
      })
  }, [searchParams])

  const updateMapping = useCallback(
    (index: number, field: keyof AccountMapping, value: string) => {
      setMappings((prev) =>
        prev.map((m, i) => {
          if (i !== index) return m
          const updated = { ...m, [field]: value }
          // Reset category when decision changes
          if (field === 'decision') {
            if (value === 'asset') updated.category = 'bank_account'
            else if (value === 'liability') updated.category = 'credit_card'
            else updated.category = ''
          }
          return updated
        })
      )
    },
    []
  )

  const finalize = async () => {
    setStep('saving')
    try {
      const res = await fetch('/api/connections/finalize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          encrypted_tokens: accountsData!.encrypted_tokens,
          bank_id: accountsData!.bank_id,
          bank_name: accountsData!.bank_name,
          bank_logo_url: accountsData!.bank_logo_url,
          consent_expires_at: accountsData!.consent_expires_at,
          token_expires_at: accountsData!.token_expires_at,
          mappings,
        }),
      })
      const data = await res.json()
      if (data.error) {
        setError(data.error)
        setStep('error')
        return
      }
      setStep('done')
      setTimeout(() => router.push('/connections'), 1500)
    } catch {
      setError('Failed to save accounts. Please try again.')
      setStep('error')
    }
  }

  const nonSkippedCount = mappings.filter((m) => m.decision !== 'skip').length

  if (step === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="w-16 h-16 rounded-2xl bg-indigo-100 flex items-center justify-center mx-auto mb-5">
            <Loader2 size={32} className="text-indigo-500 animate-spin" />
          </div>
          <p className="text-lg font-semibold text-slate-800">Connecting your bank…</p>
          <p className="text-sm text-slate-400 mt-2">Don&apos;t close this page</p>
        </div>
      </div>
    )
  }

  if (step === 'saving') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="w-16 h-16 rounded-2xl bg-indigo-100 flex items-center justify-center mx-auto mb-5">
            <Loader2 size={32} className="text-indigo-500 animate-spin" />
          </div>
          <p className="text-lg font-semibold text-slate-800">Saving your accounts…</p>
          <p className="text-sm text-slate-400 mt-2">Almost there</p>
        </div>
      </div>
    )
  }

  if (step === 'done') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="w-16 h-16 rounded-2xl bg-emerald-100 flex items-center justify-center mx-auto mb-5">
            <CheckCircle2 size={32} className="text-emerald-500" />
          </div>
          <p className="text-lg font-semibold text-slate-800">
            {nonSkippedCount} account{nonSkippedCount !== 1 ? 's' : ''} connected!
          </p>
          <p className="text-sm text-slate-400 mt-2">Redirecting to your connections…</p>
        </div>
      </div>
    )
  }

  if (step === 'error') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <Card className="max-w-md w-full border-red-200">
          <CardContent className="pt-8 pb-6 text-center">
            <div className="w-14 h-14 rounded-2xl bg-red-100 flex items-center justify-center mx-auto mb-4">
              <AlertCircle size={28} className="text-red-500" />
            </div>
            <p className="text-lg font-semibold text-slate-800 mb-2">Connection failed</p>
            <p className="text-sm text-slate-500 mb-6">{error || 'An unexpected error occurred.'}</p>
            <Button variant="outline" onClick={() => router.push('/connections')}>
              <ArrowLeft size={14} />
              Back to connections
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // step === 'mapping'
  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-2xl mx-auto px-4 py-10">
        {/* Header */}
        <div className="mb-8 text-center">
          {accountsData?.bank_logo_url ? (
            <img
              src={accountsData.bank_logo_url}
              alt={accountsData.bank_name}
              className="w-12 h-12 rounded-xl mx-auto mb-3 object-contain"
            />
          ) : (
            <div className="w-12 h-12 rounded-xl bg-indigo-100 flex items-center justify-center mx-auto mb-3">
              <Building2 size={24} className="text-indigo-500" />
            </div>
          )}
          <h1 className="text-xl font-bold text-slate-800">
            {accountsData?.bank_name} — {mappings.length} account{mappings.length !== 1 ? 's' : ''} found
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Choose how each account should be classified in Vaultly
          </p>
        </div>

        {/* Account cards */}
        <div className="space-y-4 mb-6">
          {mappings.map((mapping, i) => {
            const acc = accountsData!.accounts[i]
            const categoryOptions =
              mapping.decision === 'asset'
                ? ASSET_CATEGORIES
                : mapping.decision === 'liability'
                ? LIABILITY_CATEGORIES
                : []

            return (
              <Card key={mapping.external_account_id} className="overflow-hidden">
                <CardContent className="pt-5">
                  {/* Account header */}
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <p className="font-semibold text-slate-800">{mapping.account_name}</p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {acc?.provider?.display_name ?? accountsData?.bank_name} · {mapping.account_type}
                      </p>
                    </div>
                    <div className="text-right">
                      <p
                        className={`text-lg font-bold ${
                          mapping.decision === 'liability' ? 'text-rose-500' : 'text-emerald-600'
                        }`}
                      >
                        {formatCurrency(mapping.balance, mapping.currency)}
                      </p>
                      <p className="text-xs text-slate-400">{mapping.currency}</p>
                    </div>
                  </div>

                  {/* Dropdowns */}
                  <div className="grid grid-cols-2 gap-3">
                    <Select
                      label="Classify as"
                      value={mapping.decision}
                      onChange={(e) => updateMapping(i, 'decision', e.target.value)}
                      options={DECISION_OPTIONS}
                    />
                    {mapping.decision !== 'skip' && (
                      <Select
                        label="Category"
                        value={mapping.category}
                        onChange={(e) => updateMapping(i, 'category', e.target.value)}
                        options={categoryOptions}
                      />
                    )}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>

        {/* Action */}
        <div className="space-y-3">
          <Button
            onClick={finalize}
            disabled={nonSkippedCount === 0}
            className="w-full"
          >
            Add {nonSkippedCount} account{nonSkippedCount !== 1 ? 's' : ''} to Vaultly
          </Button>
          <p className="text-xs text-slate-400 text-center">
            Balances are read-only and will auto-sync from your bank
          </p>
        </div>
      </div>
    </div>
  )
}
