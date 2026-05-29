import { Suspense } from 'react'
import { Loader2 } from 'lucide-react'
import { CallbackContent } from './callback-content'

export default function CallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-slate-50">
          <div className="text-center">
            <div className="w-16 h-16 rounded-2xl bg-indigo-100 flex items-center justify-center mx-auto mb-5">
              <Loader2 size={32} className="text-indigo-500 animate-spin" />
            </div>
            <p className="text-lg font-semibold text-slate-800">Loading…</p>
          </div>
        </div>
      }
    >
      <CallbackContent />
    </Suspense>
  )
}
