'use client'
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend, ReferenceLine,
} from 'recharts'
import { formatCurrency } from '@/lib/utils'

interface MonthRow {
  month: string
  label: string
  income: number
  expenses: number
  net: number
}

export function MonthlyCashflow({ data, currency = 'GBP' }: { data: MonthRow[]; currency?: string }) {
  if (data.length === 0) {
    return <div className="h-52 flex items-center justify-center text-sm text-slate-400">No data yet</div>
  }

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }} barGap={2}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
        <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
        <YAxis
          tick={{ fontSize: 10, fill: '#94a3b8' }}
          axisLine={false}
          tickLine={false}
          tickFormatter={v => `£${(v / 1000).toFixed(1)}k`}
          width={44}
        />
        <Tooltip
          contentStyle={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, fontSize: 12 }}
          formatter={(v, name) => [formatCurrency(Number(v), currency), name === 'income' ? 'Income' : name === 'expenses' ? 'Expenses' : 'Net']}
          labelStyle={{ fontWeight: 600, color: '#1e293b' }}
        />
        <Legend
          iconSize={8}
          iconType="circle"
          wrapperStyle={{ fontSize: 11 }}
          formatter={(v) => v === 'income' ? 'Income' : v === 'expenses' ? 'Expenses' : 'Net'}
        />
        <ReferenceLine y={0} stroke="#e2e8f0" />
        <Bar dataKey="income" fill="#22c55e" radius={[4, 4, 0, 0]} maxBarSize={28} />
        <Bar dataKey="expenses" fill="#f43f5e" radius={[4, 4, 0, 0]} maxBarSize={28} />
      </BarChart>
    </ResponsiveContainer>
  )
}
