import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'

// GET /api/profile — full profile + connected OAuth providers
export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const [userRes, oauthRes] = await Promise.all([
    db.execute({
      sql: `SELECT id, email, full_name, avatar_url, phone, bio, date_of_birth,
                   notification_prefs, currency, household_id, created_at, updated_at
            FROM users WHERE id = ?`,
      args: [session.user.id],
    }),
    db.execute({
      sql: 'SELECT provider, created_at FROM oauth_accounts WHERE user_id = ? ORDER BY created_at ASC',
      args: [session.user.id],
    }),
  ])

  const user = userRes.rows[0]
  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  let notificationPrefs: Record<string, boolean> = {}
  try {
    notificationPrefs = JSON.parse((user.notification_prefs as string) || '{}')
  } catch {
    notificationPrefs = {}
  }

  return NextResponse.json({
    profile: {
      id: user.id,
      email: user.email,
      full_name: user.full_name,
      avatar_url: user.avatar_url,
      phone: user.phone,
      bio: user.bio,
      date_of_birth: user.date_of_birth,
      notification_prefs: notificationPrefs,
      currency: user.currency,
      household_id: user.household_id,
      created_at: user.created_at,
      updated_at: user.updated_at,
      // Which OAuth providers are linked
      connected_providers: oauthRes.rows.map(r => ({
        provider: r.provider,
        connected_at: r.created_at,
      })),
      // Whether the account has a password (false = OAuth-only)
      has_password: false, // we never expose the hash
    },
  })
}

// PATCH /api/profile — update profile fields
export async function PATCH(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const allowed = ['full_name', 'phone', 'bio', 'date_of_birth', 'currency', 'notification_prefs']
  const fields: string[] = []
  const args: unknown[] = []

  for (const key of allowed) {
    if (key in body) {
      if (key === 'notification_prefs') {
        fields.push(`notification_prefs = ?`)
        args.push(JSON.stringify(body[key]))
      } else {
        fields.push(`${key} = ?`)
        args.push(body[key])
      }
    }
  }

  if (fields.length === 0) {
    return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
  }

  fields.push(`updated_at = datetime('now')`)
  args.push(session.user.id)

  await db.execute({
    sql: `UPDATE users SET ${fields.join(', ')} WHERE id = ?`,
    args: args as import('@libsql/client').InValue[],
  })

  // Return updated profile
  const res = await db.execute({
    sql: `SELECT id, email, full_name, avatar_url, phone, bio, date_of_birth,
                 notification_prefs, currency, household_id, created_at, updated_at
          FROM users WHERE id = ?`,
    args: [session.user.id],
  })

  const user = res.rows[0]
  let notificationPrefs: Record<string, boolean> = {}
  try {
    notificationPrefs = JSON.parse((user.notification_prefs as string) || '{}')
  } catch {
    notificationPrefs = {}
  }

  return NextResponse.json({
    profile: { ...user, notification_prefs: notificationPrefs },
  })
}
