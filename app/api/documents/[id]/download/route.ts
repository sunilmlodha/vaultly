import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { getSignedDownloadUrl } from '@/lib/blob'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  // Verify the document belongs to this household
  const result = await db.execute({
    sql: 'SELECT blob_url, name FROM documents WHERE id = ? AND household_id = ?',
    args: [id, session.user.householdId],
  })

  if (result.rows.length === 0) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const { blob_url, name } = result.rows[0] as { blob_url: string; name: string }

  const signedUrl = await getSignedDownloadUrl(blob_url)

  // Redirect to the signed URL — browser will download the file directly from Blob
  return NextResponse.redirect(signedUrl)
}
