import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { randomUUID } from 'crypto'

// POST /api/notifications/subscribe — save web push subscription
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { endpoint, keys } = await req.json()
  if (!endpoint || !keys?.p256dh || !keys?.auth) {
    return NextResponse.json({ error: 'Invalid subscription object' }, { status: 400 })
  }

  await db.execute({
    sql: `INSERT INTO push_subscriptions (id, user_id, endpoint, p256dh, auth)
          VALUES (?, ?, ?, ?, ?)
          ON CONFLICT (user_id, endpoint) DO UPDATE SET p256dh = excluded.p256dh, auth = excluded.auth`,
    args: [randomUUID(), session.user.id, endpoint, keys.p256dh, keys.auth],
  })

  return NextResponse.json({ success: true })
}

// DELETE /api/notifications/subscribe — remove push subscription
export async function DELETE(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { endpoint } = await req.json()
  await db.execute({
    sql: 'DELETE FROM push_subscriptions WHERE user_id = ? AND endpoint = ?',
    args: [session.user.id, endpoint],
  })

  return NextResponse.json({ success: true })
}
