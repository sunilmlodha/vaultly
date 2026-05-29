import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'
import { db } from './db'

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Credentials({
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null

        const result = await db.execute({
          sql: 'SELECT * FROM users WHERE email = ?',
          args: [credentials.email as string],
        })

        const user = result.rows[0]
        if (!user) return null

        const valid = await bcrypt.compare(
          credentials.password as string,
          user.password_hash as string
        )
        if (!valid) return null

        return {
          id: user.id as string,
          email: user.email as string,
          name: user.full_name as string,
          householdId: user.household_id as string,
        }
      },
    }),
  ],
  callbacks: {
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
        ;(session.user as { householdId?: string }).householdId = token.householdId as string
      }
      return session
    },
  },
  pages: {
    signIn: '/login',
  },
  session: { strategy: 'jwt' },
})
