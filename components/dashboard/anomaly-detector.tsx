'use client'
import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { formatCurrency } from '@/lib/utils'
import { AlertTriangle, Info, ShieldAlert, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react'

interface Anomaly {
  type: 'new_merchant' | 'price_increase' | 'duplicate_charge' | 'subscription_detected'
  title: string
  description: string
  amount: number
  currency: string
  date: string
  merchant: string
  severity: 'info' | 'warning' | 'alert'
}

const SEVERITY_CONFIG = {
  alert: { icon: ShieldAlert, color: 'text-rose-600', bg: 'bg-rose-50', border: 'border-rose-200', label: 'Alert' },
  warning: { icon: AlertTriangle, color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200', label: 'Warning' },
  info: { icon: Info, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200', label: 'Info' },
}

export function AnomalyDetector() {
  const [anomalies, setAnomalies] = useState<Anomaly[]>([])
  const [loading, setLoading] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const [expanded, setExpanded] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/analytics/anomalies')
      if (!res.ok) throw new Error('Failed to load')
      const { anomalies: data } = await res.json()
      setAnomalies(data || [])
      setLoaded(true)
    } catch {
      setError('Could not run anomaly scan')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const alerts = anomalies.filter(a => a.severity === 'alert')
  const warnings = anomalies.filter(a => a.severity === 'warning')

  return (
    <Card className={`${alerts.length > 0 ? 'border-rose-200' : warnings.length > 0 ? 'border-amber-200' : ''}`}>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="flex items-center gap-2">
          <ShieldAlert size={16} className={alerts.length > 0 ? 'text-rose-500' : warnings.length > 0 ? 'text-amber-500' : 'text-slate-400'} />
          Anomaly &amp; Subscription Detector
          {loaded && anomalies.length > 0 && (
            <span className={`text-xs font-normal px-2 py-0.5 rounded-full ${alerts.length > 0 ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'}`}>
              {anomalies.length} found
            </span>
          )}
        </CardTitle>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={load} disabled={loading}>
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
          </Button>
          {loaded && anomalies.length > 0 && (
            <Button variant="ghost" size="sm" onClick={() => setExpanded(e => !e)}>
              {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {loading && (
          <div className="flex items-center gap-2 text-sm text-slate-500 py-2">
            <div className="w-4 h-4 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
            Scanning your last 90 days of transactions…
          </div>
        )}
        {error && !loading && (
          <p className="text-sm text-slate-400 py-2">{error}</p>
        )}
        {loaded && !loading && anomalies.length === 0 && (
          <div className="flex items-center gap-2 text-sm text-emerald-700 bg-emerald-50 rounded-xl px-3 py-2">
            <span className="text-base">✓</span> No anomalies detected in the last 90 days.
          </div>
        )}
        {loaded && !loading && anomalies.length > 0 && expanded && (
          <div className="space-y-2 mt-1">
            {anomalies.map((a, i) => {
              const cfg = SEVERITY_CONFIG[a.severity]
              const Icon = cfg.icon
              return (
                <div key={i} className={`flex items-start gap-3 p-3 rounded-xl border ${cfg.bg} ${cfg.border}`}>
                  <Icon size={14} className={`${cfg.color} shrink-0 mt-0.5`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className={`text-xs font-semibold ${cfg.color}`}>{a.title}</p>
                      <span className="text-xs text-slate-400 shrink-0">{a.date}</span>
                    </div>
                    <p className="text-xs text-slate-700 mt-0.5 leading-relaxed">{a.description}</p>
                  </div>
                  <p className="text-xs font-semibold text-slate-600 shrink-0">{formatCurrency(a.amount, a.currency)}</p>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
