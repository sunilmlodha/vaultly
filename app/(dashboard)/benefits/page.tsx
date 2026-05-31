'use client'

import { useState } from 'react'
import { Topbar } from '@/components/layout/topbar'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { formatCurrency } from '@/lib/utils'

// ── Salary range options ──────────────────────────────────────────────────────
const SALARY_LABELS = [
  'Under ₹20 LPA',
  '₹20-30 LPA',
  '₹30-40 LPA',
  '₹40-55 LPA',
  '₹55-75 LPA',
  '₹75 LPA+',
]

const SALARY_VALUES = [1700000, 2500000, 3500000, 4750000, 6500000, 9000000]

// ── Opportunity card types ────────────────────────────────────────────────────
type UrgencyLevel = 'High' | 'Medium' | 'Low'

interface BenefitOpportunity {
  type: 'pension' | 'salary_sacrifice' | 'cycle' | 'shares' | 'isa'
  title: string
  description: string
  annualSaving: number
  urgency: UrgencyLevel
  cta: string
}

// ── Type icon map ─────────────────────────────────────────────────────────────
const TYPE_ICON: Record<BenefitOpportunity['type'], string> = {
  pension: '🏛️',
  salary_sacrifice: '💰',
  cycle: '🚲',
  shares: '📈',
  isa: '💳',
}

// ── Urgency badge colours ─────────────────────────────────────────────────────
const URGENCY_STYLE: Record<UrgencyLevel, string> = {
  High: 'bg-red-100 text-red-700',
  Medium: 'bg-amber-100 text-amber-700',
  Low: 'bg-slate-100 text-slate-600',
}

// ── API response type ─────────────────────────────────────────────────────────
interface BenefitsApiResponse {
  orgConfigured: boolean
  opportunities: BenefitOpportunity[]
  totalAnnualSaving: number
}

export default function BenefitsPage() {
  const [salaryIndex, setSalaryIndex] = useState(2) // default ₹30-40 LPA
  const [pensionPct, setPensionPct] = useState(8)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<BenefitsApiResponse | null>(null)
  const [error, setError] = useState<string | null>(null)

  const annualSalary = SALARY_VALUES[salaryIndex]

  async function handleCalculate() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/benefits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ annualSalary, currentPensionPct: pensionPct }),
      })
      if (!res.ok) throw new Error('Failed to fetch benefits')
      const data: BenefitsApiResponse = await res.json()
      setResult(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col min-h-screen bg-slate-50">
      <Topbar
        title="Benefits Optimiser"
        subtitle="Maximise what your employer offers"
      />

      <main className="flex-1 p-4 md:p-8 max-w-3xl mx-auto w-full space-y-6">

        {/* ── Input card ──────────────────────────────────────────────────── */}
        <Card>
          <CardContent className="pt-6 space-y-6">

            {/* Salary range picker */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">
                Annual Salary Range
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {SALARY_LABELS.map((label, idx) => (
                  <button
                    key={idx}
                    onClick={() => setSalaryIndex(idx)}
                    className={`rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                      salaryIndex === idx
                        ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                        : 'border-slate-200 bg-white text-slate-600 hover:border-indigo-300'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Pension contribution slider */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-sm font-semibold text-slate-700">
                  Current Pension Contribution (EPF + Voluntary)
                </label>
                <span className="text-sm font-bold text-indigo-600">{pensionPct}%</span>
              </div>
              <input
                type="range"
                min={0}
                max={15}
                step={1}
                value={pensionPct}
                onChange={e => setPensionPct(Number(e.target.value))}
                className="w-full accent-indigo-600"
              />
              <div className="flex justify-between text-xs text-slate-400">
                <span>0%</span>
                <span>15%</span>
              </div>
            </div>

            <Button
              onClick={handleCalculate}
              disabled={loading}
              className="w-full"
            >
              {loading ? 'Calculating…' : 'Calculate my benefits'}
            </Button>

          </CardContent>
        </Card>

        {/* ── Error state ──────────────────────────────────────────────────── */}
        {error && (
          <p className="text-sm text-red-600 text-center">{error}</p>
        )}

        {/* ── Results ──────────────────────────────────────────────────────── */}
        {result && (
          <>
            {result.orgConfigured === false ? (
              <Card>
                <CardContent className="pt-6 text-center text-slate-500 text-sm">
                  No employer benefits configured. Ask your HR team to connect Tijori/Vaultly.
                </CardContent>
              </Card>
            ) : (
              <>
                {/* Total saving banner */}
                <div className="rounded-xl bg-indigo-600 text-white px-6 py-4 text-center">
                  <p className="text-sm font-medium opacity-80">You could save</p>
                  <p className="text-3xl font-bold mt-1">
                    {formatCurrency(result.totalAnnualSaving, 'INR')}
                  </p>
                  <p className="text-sm font-medium opacity-80 mt-1">this year</p>
                </div>

                {/* Opportunity cards */}
                <div className="space-y-3">
                  {result.opportunities.map((opp, idx) => (
                    <Card key={idx}>
                      <CardContent className="pt-4 pb-4">
                        <div className="flex items-start gap-4">
                          {/* Icon */}
                          <span className="text-2xl shrink-0">{TYPE_ICON[opp.type]}</span>

                          {/* Body */}
                          <div className="flex-1 min-w-0 space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="text-sm font-semibold text-slate-800">{opp.title}</h3>
                              <span
                                className={`text-xs font-medium px-2 py-0.5 rounded-full ${URGENCY_STYLE[opp.urgency]}`}
                              >
                                {opp.urgency}
                              </span>
                            </div>
                            <p className="text-xs text-slate-500">{opp.description}</p>
                            <p className="text-sm font-bold text-green-600">
                              Save {formatCurrency(opp.annualSaving, 'INR')} / year
                            </p>
                          </div>

                          {/* CTA */}
                          <div className="shrink-0">
                            <Button size="sm" variant="outline">
                              {opp.cta}
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </>
            )}
          </>
        )}
      </main>
    </div>
  )
}
