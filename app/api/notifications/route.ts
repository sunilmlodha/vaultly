import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'

// GET /api/notifications — fetch recent notifications
export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const res = await db.execute({
    sql: `SELECT id, type, title, body, action_url, read, created_at
          FROM notifications WHERE user_id = ?
          ORDER BY created_at DESC LIMIT 30`,
    args: [session.user.id],
  })

  const unreadCount = res.rows.filter(n => !n.read).length

  return NextResponse.json({ notifications: res.rows, unreadCount })
}

// PATCH /api/notifications — mark all as read
export async function PATCH(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json().catch(() => ({}))
  const { id } = body

  if (id) {
    // Mark single notification as read
    await db.execute({
      sql: 'UPDATE notifications SET read = 1 WHERE id = ? AND user_id = ?',
      args: [id, session.user.id],
    })
  } else {
    // Mark all as read
    await db.execute({
      sql: 'UPDATE notifications SET read = 1 WHERE user_id = ?',
      args: [session.user.id],
    })
  }

  return NextResponse.json({ success: true })
}
