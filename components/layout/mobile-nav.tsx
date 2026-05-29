'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { LayoutDashboard, Wallet, RefreshCw, Search, BarChart3 } from 'lucide-react'
import { useTranslations } from 'next-intl'

export function MobileNav() {
  const pathname = usePathname()
  const t = useTranslations('nav')

  const nav = [
    { href: '/dashboard', label: t('dashboard'), icon: LayoutDashboard },
    { href: '/assets', label: t('assets'), icon: Wallet },
    { href: '/spending', label: t('spending'), icon: BarChart3 },
    { href: '/agent', label: t('agent'), icon: Search },
    { href: '/renewals', label: t('renewals'), icon: RefreshCw },
  ]

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-100 z-40 safe-area-pb">
      <div className="flex items-center justify-around px-2 py-2">
        {nav.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || (href !== '/dashboard' && pathname.startsWith(href))
          return (
            <Link key={href} href={href} className="flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-all">
              <Icon size={20} className={cn(active ? 'text-indigo-500' : 'text-slate-400')} />
              <span className={cn('text-[10px] font-medium', active ? 'text-indigo-500' : 'text-slate-400')}>{label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
