import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'
import { db } from './db'
import { authConfig } from './auth.config'

// Full auth — uses bcryptjs + db (Node.js runtime only)
// Do NOT import this in middleware.ts — use lib/auth.config.ts there instead

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
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
})
