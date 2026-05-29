'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard, Wallet, CreditCard, Users, RefreshCw,
  FileText, Target, Search, LogOut, Vault, Landmark, BarChart3, Settings, TrendingUp
} from 'lucide-react'
import { signOut } from 'next-auth/react'

const nav = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/assets', label: 'Assets', icon: Wallet },
  { href: '/liabilities', label: 'Liabilities', icon: CreditCard },
  { href: '/goals', label: 'Goals', icon: Target },
  { href: '/renewals', label: 'Renewals', icon: RefreshCw },
  { href: '/connections', label: 'Connected Banks', icon: Landmark },
  { href: '/spending', label: 'Spending Analytics', icon: BarChart3 },
  { href: '/forecast', label: 'Cashflow Forecast', icon: TrendingUp },
  { href: '/documents', label: 'Documents', icon: FileText },
  { href: '/family', label: 'Family', icon: Users },
  { href: '/agent', label: 'Asset Recovery', icon: Search, highlight: true },
  { href: '/settings', label: 'Settings', icon: Settings },
]

export function Sidebar() {
  const pathname = usePathname()

  const handleSignOut = async () => {
    await signOut({ callbackUrl: '/' })
  }

  return (
    <aside className="hidden md:flex flex-col w-64 bg-white border-r border-slate-100 h-screen sticky top-0">
      {/* Logo */}
      <div className="px-6 py-5 border-b border-slate-100">
        <Link href="/dashboard" className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-indigo-500 flex items-center justify-center">
            <Vault size={16} className="text-white" />
          </div>
          <span className="text-lg font-bold text-slate-800">Vaultly</span>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {nav.map(({ href, label, icon: Icon, highlight }) => {
          const active = pathname === href || (href !== '/dashboard' && pathname.startsWith(href))
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all',
                active
                  ? 'bg-indigo-50 text-indigo-600'
                  : highlight
                  ? 'text-indigo-500 hover:bg-indigo-50'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-800'
              )}
            >
              <Icon size={17} className={cn(active ? 'text-indigo-500' : '')} />
              {label}
              {highlight && !active && (
                <span className="ml-auto text-[10px] bg-indigo-100 text-indigo-600 px-1.5 py-0.5 rounded-full font-semibold">AI</span>
              )}
            </Link>
          )
        })}
      </nav>

      {/* Sign out */}
      <div className="px-3 py-4 border-t border-slate-100">
        <button
          onClick={handleSignOut}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-500 hover:bg-slate-50 hover:text-slate-700 transition-all"
        >
          <LogOut size={17} />
          Sign out
        </button>
      </div>
    </aside>
  )
}
