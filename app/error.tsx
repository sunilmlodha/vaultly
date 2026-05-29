'use client'
import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { AlertTriangle } from 'lucide-react'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log to console for debugging — non-fatal
    console.error('[Global error boundary]', error)
  }, [error])

  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl shadow-md p-8 max-w-md w-full text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mx-auto">
            <AlertTriangle size={22} className="text-red-500" />
          </div>
          <h1 className="text-lg font-bold text-slate-800">Something went wrong</h1>
          <p className="text-sm text-slate-500">
            An unexpected error occurred. Try refreshing the page.
          </p>
          <div className="flex gap-3 justify-center">
            <Button onClick={reset} size="sm">Try again</Button>
            <Button variant="outline" size="sm" onClick={() => (window.location.href = '/dashboard')}>
              Go to dashboard
            </Button>
          </div>
        </div>
      </body>
    </html>
  )
}
