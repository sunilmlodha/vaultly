import webpush from 'web-push'
import { db } from './db'
import { randomUUID } from 'crypto'

webpush.setVapidDetails(
  `mailto:${process.env.VAPID_EMAIL ?? 'hello@vaultly.app'}`,
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? '',
  process.env.VAPID_PRIVATE_KEY ?? ''
)

export interface PushPayload {
  title: string
  body: string
  icon?: string
  url?: string
  tag?: string
}

export async function sendPushToUser(userId: string, payload: PushPayload) {
  const res = await db.execute({
    sql: 'SELECT endpoint, p256dh, auth FROM push_subscriptions WHERE user_id = ?',
    args: [userId],
  })

  const results = await Promise.allSettled(
    res.rows.map(row =>
      webpush.sendNotification(
        {
          endpoint: row.endpoint as string,
          keys: { p256dh: row.p256dh as string, auth: row.auth as string },
        },
        JSON.stringify({
          title: payload.title,
          body: payload.body,
          icon: payload.icon ?? '/icons/icon-192.png',
          url: payload.url ?? '/',
          tag: payload.tag ?? 'vaultly',
        })
      ).catch(async err => {
        // Remove expired/invalid subscriptions
        if (err.statusCode === 410 || err.statusCode === 404) {
          await db.execute({
            sql: 'DELETE FROM push_subscriptions WHERE user_id = ? AND endpoint = ?',
            args: [userId, row.endpoint],
          })
        }
        throw err
      })
    )
  )

  return results
}

export async function saveInAppNotification(
  userId: string,
  type: 'vault_score' | 'narrative' | 'renewal' | 'goal' | 'milestone' | 'system',
  title: string,
  body: string,
  actionUrl?: string
) {
  await db.execute({
    sql: `INSERT INTO notifications (id, user_id, type, title, body, action_url)
          VALUES (?, ?, ?, ?, ?, ?)`,
    args: [randomUUID(), userId, type, title, body, actionUrl ?? null],
  })
}
