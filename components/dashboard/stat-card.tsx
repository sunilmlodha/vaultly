import { cn, formatCurrency } from '@/lib/utils'
import { Card, CardContent } from '@/components/ui/card'
import type { LucideIcon } from 'lucide-react'

interface StatCardProps {
  title: string
  value: number
  currency?: string
  icon: LucideIcon
  color: 'indigo' | 'emerald' | 'rose' | 'amber'
  change?: number
  subtitle?: string
}

const colors = {
  indigo: { bg: 'bg-indigo-50', icon: 'text-indigo-500', value: 'text-indigo-600' },
  emerald: { bg: 'bg-emerald-50', icon: 'text-emerald-500', value: 'text-emerald-600' },
  rose: { bg: 'bg-rose-50', icon: 'text-rose-500', value: 'text-rose-600' },
  amber: { bg: 'bg-amber-50', icon: 'text-amber-500', value: 'text-amber-600' },
}

export function StatCard({ title, value, currency = 'GBP', icon: Icon, color, change, subtitle }: StatCardProps) {
  const c = colors[color]
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="pt-5">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">{title}</p>
            <p className={cn('text-2xl font-bold mt-1', c.value)}>{formatCurrency(value, currency)}</p>
            {subtitle && <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>}
            {change !== undefined && (
              <p className={cn('text-xs font-medium mt-1', change >= 0 ? 'text-emerald-600' : 'text-rose-600')}>
                {change >= 0 ? '+' : ''}{change.toFixed(1)}% this month
              </p>
            )}
          </div>
          <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center', c.bg)}>
            <Icon size={20} className={c.icon} />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
