'use client'
import { getInitials } from '@/lib/utils'

interface TopbarProps {
  title: string
  subtitle?: string
  userName?: string
  actions?: React.ReactNode
}

export function Topbar({ title, subtitle, userName, actions }: TopbarProps) {
  return (
    <header className="flex items-center justify-between px-4 md:px-8 py-4 bg-white border-b border-slate-100">
      <div>
        <h1 className="text-lg font-bold text-slate-800">{title}</h1>
        {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
      </div>
      <div className="flex items-center gap-3">
        {actions}
        {userName && (
          <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 text-xs font-bold">
            {getInitials(userName)}
          </div>
        )}
      </div>
    </header>
  )
}
