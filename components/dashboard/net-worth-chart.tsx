'use client'
import { formatCurrency } from '@/lib/utils'
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts'

const mockData = [
  { month: 'Dec', value: 245000 },
  { month: 'Jan', value: 258000 },
  { month: 'Feb', value: 251000 },
  { month: 'Mar', value: 267000 },
  { month: 'Apr', value: 272000 },
  { month: 'May', value: 289000 },
]

interface NetWorthChartProps {
  netWorth: number
}

export function NetWorthChart({ netWorth }: NetWorthChartProps) {
  const data = mockData.map((d, i) =>
    i === mockData.length - 1 ? { ...d, value: netWorth } : d
  )
  return (
    <div>
      <p className="text-3xl font-bold text-slate-800 mb-1">{formatCurrency(netWorth)}</p>
      <p className="text-sm text-emerald-600 font-medium mb-4">+6.2% since last month</p>
      <ResponsiveContainer width="100%" height={160}>
        <AreaChart data={data} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id="nwGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#6366f1" stopOpacity={0.15} />
              <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
          <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
          <YAxis hide />
          <Tooltip
            contentStyle={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, fontSize: 12 }}
            formatter={(v) => [formatCurrency(Number(v)), 'Net Worth']}
          />
          <Area type="monotone" dataKey="value" stroke="#6366f1" strokeWidth={2.5} fill="url(#nwGradient)" dot={false} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
