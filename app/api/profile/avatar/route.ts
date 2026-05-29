import { NextRequest, NextResponse } from 'next/server'
import { put } from '@vercel/blob'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'

// POST /api/profile/avatar — upload avatar image to Vercel Blob
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const formData = await req.formData()
  const file = formData.get('avatar') as File | null
  if (!file) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 })
  }

  const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
  if (!allowed.includes(file.type)) {
    return NextResponse.json(
      { error: 'Only JPEG, PNG, WebP or GIF images are allowed' },
      { status: 400 }
    )
  }

  const maxBytes = 5 * 1024 * 1024 // 5 MB
  if (file.size > maxBytes) {
    return NextResponse.json({ error: 'File must be under 5 MB' }, { status: 400 })
  }

  const ext = file.name.split('.').pop() || 'jpg'
  const pathname = `avatars/${session.user.id}.${ext}`

  const blob = await put(pathname, file, {
    access: 'public',
    addRandomSuffix: false,
  })

  await db.execute({
    sql: `UPDATE users SET avatar_url = ?, updated_at = datetime('now') WHERE id = ?`,
    args: [blob.url, session.user.id],
  })

  return NextResponse.json({ avatar_url: blob.url })
}

// DELETE /api/profile/avatar — remove avatar
export async function DELETE() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  await db.execute({
    sql: `UPDATE users SET avatar_url = NULL, updated_at = datetime('now') WHERE id = ?`,
    args: [session.user.id],
  })

  return NextResponse.json({ success: true })
}
