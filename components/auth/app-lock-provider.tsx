'use client'
import { useSession } from 'next-auth/react'
import { LockScreen } from '@/components/auth/lock-screen'
import { useAppLock } from '@/hooks/use-app-lock'

export function AppLockProvider({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession()
  const { locked, pinExists, markUnlocked } = useAppLock()

  if (locked && pinExists) {
    return (
      <>
        {/* Render children in the background so they don't need to reload on unlock */}
        <div aria-hidden className="pointer-events-none opacity-0 fixed inset-0">
          {children}
        </div>
        <LockScreen
          onUnlock={markUnlocked}
          userEmail={session?.user?.email ?? ''}
        />
      </>
    )
  }

  return <>{children}</>
}
