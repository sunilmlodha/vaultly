import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import Google from 'next-auth/providers/google'
import GitHub from 'next-auth/providers/github'
import Facebook from 'next-auth/providers/facebook'
import MicrosoftEntraId from 'next-auth/providers/microsoft-entra-id'
import bcrypt from 'bcryptjs'
import { randomUUID } from 'crypto'
import { db } from './db'
import { authConfig } from './auth.config'

// Full auth — Node.js runtime only
// Do NOT import this in middleware.ts — use lib/auth.config.ts there instead

async function getOrCreateOAuthUser(
  email: string,
  name: string,
  avatarUrl: string | null | undefined,
  provider: string,
  providerAccountId: string
): Promise<{ id: string; householdId: string }> {
  // Check if user already exists by email
  const existing = await db.execute({
    sql: 'SELECT id, household_id FROM users WHERE email = ?',
    args: [email],
  })

  if (existing.rows.length > 0) {
    const dbUser = existing.rows[0]
    const userId = dbUser.id as string
    const householdId = dbUser.household_id as string

    // Link this OAuth provider if not already linked
    const linked = await db.execute({
      sql: 'SELECT id FROM oauth_accounts WHERE provider = ? AND provider_account_id = ?',
      args: [provider, providerAccountId],
    })
    if (linked.rows.length === 0) {
      await db.execute({
        sql: 'INSERT INTO oauth_accounts (id, user_id, provider, provider_account_id) VALUES (?, ?, ?, ?)',
        args: [randomUUID(), userId, provider, providerAccountId],
      })
    }
    return { id: userId, householdId }
  }

  // New OAuth user — create user + household + membership atomically
  const userId = randomUUID()
  const householdId = randomUUID()
  const memberId = randomUUID()
  const oauthId = randomUUID()
  const firstName = name?.split(' ')[0] || 'My'
  const householdName = `${firstName}'s Vault`

  await db.batch([
    {
      sql: 'INSERT INTO households (id, name, owner_id) VALUES (?, ?, ?)',
      args: [householdId, householdName, userId],
    },
    {
      sql: `INSERT INTO users (id, email, full_name, avatar_url, household_id)
            VALUES (?, ?, ?, ?, ?)`,
      args: [userId, email, name || '', avatarUrl || null, householdId],
    },
    {
      sql: 'INSERT INTO household_members (id, household_id, user_id, role, accepted) VALUES (?, ?, ?, ?, 1)',
      args: [memberId, householdId, userId, 'owner'],
    },
    {
      sql: 'INSERT INTO oauth_accounts (id, user_id, provider, provider_account_id) VALUES (?, ?, ?, ?)',
      args: [oauthId, userId, provider, providerAccountId],
    },
  ])

  return { id: userId, householdId }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,

  providers: [
    // ── Email + password ──────────────────────────────────────────────────
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
        if (!user || !user.password_hash) return null

        const valid = await bcrypt.compare(
          credentials.password as string,
          user.password_hash as string
        )
        if (!valid) return null

        return {
          id: user.id as string,
          email: user.email as string,
          name: user.full_name as string,
          image: (user.avatar_url as string | null) ?? undefined,
          householdId: user.household_id as string,
        }
      },
    }),

    // ── Google ────────────────────────────────────────────────────────────
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID ?? '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? '',
    }),

    // ── Microsoft ─────────────────────────────────────────────────────────
    MicrosoftEntraId({
      clientId: process.env.MICROSOFT_ENTRA_CLIENT_ID ?? '',
      clientSecret: process.env.MICROSOFT_ENTRA_CLIENT_SECRET ?? '',
      // issuer scopes the app to a single tenant; omit (or use 'common') for multi-tenant
      ...(process.env.MICROSOFT_ENTRA_TENANT_ID && process.env.MICROSOFT_ENTRA_TENANT_ID !== 'common'
        ? {
            issuer: `https://login.microsoftonline.com/${process.env.MICROSOFT_ENTRA_TENANT_ID}/v2.0`,
          }
        : {}),
    }),

    // ── GitHub ────────────────────────────────────────────────────────────
    GitHub({
      clientId: process.env.GITHUB_ID ?? '',
      clientSecret: process.env.GITHUB_SECRET ?? '',
    }),

    // ── Facebook ──────────────────────────────────────────────────────────
    Facebook({
      clientId: process.env.FACEBOOK_CLIENT_ID ?? '',
      clientSecret: process.env.FACEBOOK_CLIENT_SECRET ?? '',
    }),
  ],

  callbacks: {
    // Called on every sign-in. OAuth path creates/links user in DB.
    async signIn({ user, account }) {
      if (account?.provider === 'credentials') return true
      if (!account || !user.email) return false

      try {
        const { id, householdId } = await getOrCreateOAuthUser(
          user.email,
          user.name ?? '',
          user.image,
          account.provider,
          account.providerAccountId
        )
        user.id = id
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ;(user as any).householdId = householdId
        return true
      } catch (err) {
        console.error('[auth] OAuth signIn error:', err)
        return false
      }
    },

    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        token.householdId = (user as any).householdId as string
      }
      // Backfill householdId for sessions created before it was added to the token
      if (token.id && !token.householdId) {
        try {
          const res = await db.execute({
            sql: 'SELECT household_id FROM users WHERE id = ?',
            args: [token.id as string],
          })
          token.householdId = res.rows[0]?.household_id as string
        } catch { /* non-critical */ }
      }
      return token
    },

    session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ;(session.user as any).householdId = token.householdId as string
      }
      return session
    },
  },
})
