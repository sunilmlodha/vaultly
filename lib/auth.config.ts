import type { NextAuthConfig } from 'next-auth'

// Edge-compatible auth config — NO Node.js-only imports (no bcryptjs, no db)
// Used by middleware (if added). Callbacks live in lib/auth.ts (Node.js only).

export const authConfig: NextAuthConfig = {
  pages: {
    signIn: '/login',
    error: '/login',
  },
  providers: [], // Providers added in lib/auth.ts
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user
      const { pathname } = nextUrl

      const isAuthPage =
        pathname.startsWith('/login') || pathname.startsWith('/signup')
      const isPublic =
        pathname === '/' ||
        pathname.startsWith('/api/auth') ||
        pathname.startsWith('/api/signup')

      if (!isLoggedIn && !isAuthPage && !isPublic) return false
      if (isLoggedIn && isAuthPage) {
        return Response.redirect(new URL('/dashboard', nextUrl))
      }
      return true
    },
  },
}
