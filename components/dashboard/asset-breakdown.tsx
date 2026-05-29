'use client'
import { formatCurrency } from '@/lib/utils'
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from 'recharts'
import type { Asset } from '@/lib/types'

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#3b82f6', '#ec4899', '#8b5cf6', '#14b8a6']

const LABELS: Record<string, string> = {
  bank_account: 'Bank',
  investment: 'Investments',
  pension: 'Pensions',
  property: 'Property',
  crypto: 'Crypto',
  insurance: 'Insurance',
  other: 'Other',
}

export function AssetBreakdown({ assets }: { assets: Asset[] }) {
  const grouped = assets.reduce<Record<string, number>>((acc, a) => {
    acc[a.category] = (acc[a.category] || 0) + a.value
    return acc
  }, {})

  const data = Object.entries(grouped).map(([key, value]) => ({
    name: LABELS[key] || key,
    value,
  }))

  if (data.length === 0) {
    return <div className="h-40 flex items-center justify-center text-sm text-slate-400">No assets yet</div>
  }

  return (
    <ResponsiveContainer width="100%" height={200}>
      <PieChart>
        <Pie data={data} cx="50%" cy="50%" innerRadius={55} outerRadius={80} paddingAngle={3} dataKey="value">
          {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
        </Pie>
        <Tooltip
          contentStyle={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, fontSize: 12 }}
          formatter={(v) => [formatCurrency(Number(v)), '']}
        />
        <Legend iconSize={8} iconType="circle" wrapperStyle={{ fontSize: 11 }} />
      </PieChart>
    </ResponsiveContainer>
  )
}
