import NextAuth from 'next-auth'
import { authConfig } from '@/lib/auth.config'

// proxy.ts — Next.js 16 equivalent of middleware.ts
// Uses Edge-safe authConfig only (no bcryptjs, no db imports)

const { auth } = NextAuth(authConfig)

export default auth

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
