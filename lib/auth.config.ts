import type { NextAuthConfig } from 'next-auth'

// Edge-compatible auth config — NO Node.js-only imports (no bcryptjs, no db)
// Used by middleware.ts which runs on Vercel Edge Runtime
// The full auth (with Credentials + bcryptjs) lives in lib/auth.ts

export const authConfig: NextAuthConfig = {
  pages: {
    signIn: '/login',
  },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user
      const { pathname } = nextUrl

      const isAuthPage = pathname.startsWith('/login') || pathname.startsWith('/signup')
      const isPublic =
        pathname === '/' ||
        pathname.startsWith('/api/auth') ||
        pathname.startsWith('/api/signup')

      if (!isLoggedIn && !isAuthPage && !isPublic) {
        // Redirect unauthenticated users to login
        return false
      }
      if (isLoggedIn && isAuthPage) {
        // Redirect logged-in users away from auth pages
        return Response.redirect(new URL('/dashboard', nextUrl))
      }
      return true
    },
    jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.householdId = (user as { householdId?: string }).householdId
      }
      return token
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string
        ;(session.user as { householdId?: string }).householdId =
          token.householdId as string
      }
      return session
    },
  },
  providers: [], // Credentials provider is added in lib/auth.ts (Node.js only)
}
