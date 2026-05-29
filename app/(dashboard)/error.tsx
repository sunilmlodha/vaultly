'use client'
import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { AlertTriangle } from 'lucide-react'

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[Dashboard error]', error)
  }, [error])

  return (
    <div className="flex-1 flex items-center justify-center p-8">
      <div className="bg-white rounded-2xl shadow-md p-8 max-w-md w-full text-center space-y-4">
        <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mx-auto">
          <AlertTriangle size={22} className="text-red-500" />
        </div>
        <h1 className="text-lg font-bold text-slate-800">Something went wrong</h1>
        <p className="text-sm text-slate-500">
          An unexpected error occurred loading this page.
        </p>
        <div className="flex gap-3 justify-center">
          <Button onClick={reset} size="sm">Try again</Button>
          <Button variant="outline" size="sm" onClick={() => (window.location.href = '/dashboard')}>
            Dashboard
          </Button>
        </div>
      </div>
    </div>
  )
}
