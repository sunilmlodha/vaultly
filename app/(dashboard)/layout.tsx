import { Sidebar } from '@/components/layout/sidebar'
import { MobileNav } from '@/components/layout/mobile-nav'
import { AppLockProvider } from '@/components/auth/app-lock-provider'
import { UserPrefsProvider } from '@/components/providers/user-prefs-provider'
import { PushPermissionBanner } from '@/components/notifications/push-permission'
import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session?.user) redirect('/login')

  return (
    <UserPrefsProvider>
      <AppLockProvider>
        <div className="flex h-screen bg-slate-50 overflow-hidden">
          <Sidebar />
          <main className="flex-1 overflow-y-auto pb-20 md:pb-0">
            {children}
          </main>
          <MobileNav />
        </div>
        <PushPermissionBanner />
      </AppLockProvider>
    </UserPrefsProvider>
  )
}
