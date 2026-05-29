'use client'
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from 'recharts'
import { formatCurrency } from '@/lib/utils'

interface CategoryRow {
  category: string
  label: string
  icon: string
  color: string
  amount: number
  count: number
  pct: number
}

interface Props {
  categories: CategoryRow[]
  currency?: string
}

export function SpendingBreakdown({ categories, currency = 'GBP' }: Props) {
  const top = categories.slice(0, 8) // donut shows top 8

  if (top.length === 0) {
    return <div className="h-52 flex items-center justify-center text-sm text-slate-400">No spending data yet</div>
  }

  return (
    <ResponsiveContainer width="100%" height={220}>
      <PieChart>
        <Pie
          data={top}
          cx="50%"
          cy="50%"
          innerRadius={58}
          outerRadius={88}
          paddingAngle={2}
          dataKey="amount"
          nameKey="label"
        >
          {top.map((row) => (
            <Cell key={row.category} fill={row.color} />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, fontSize: 12 }}
          formatter={(v, name) => [formatCurrency(Number(v), currency), name]}
        />
        <Legend
          iconSize={8}
          iconType="circle"
          wrapperStyle={{ fontSize: 11 }}
          formatter={(value, entry) => {
            const row = entry.payload as unknown as CategoryRow
            return `${row.icon} ${value}`
          }}
        />
      </PieChart>
    </ResponsiveContainer>
  )
}
