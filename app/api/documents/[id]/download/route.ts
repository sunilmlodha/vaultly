import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { fetchPrivateBlob } from '@/lib/blob'

export const maxDuration = 60

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

  const row = result.rows[0] as unknown as { blob_url: string; name: string }

  // Fetch the private blob using the server-side token and stream it to the client
  const blobRes = await fetchPrivateBlob(row.blob_url)
  if (!blobRes.ok) {
    return NextResponse.json({ error: 'Failed to retrieve file' }, { status: 502 })
  }

  const contentType = blobRes.headers.get('content-type') || 'application/octet-stream'
  const filename = encodeURIComponent(row.name)

  return new NextResponse(blobRes.body, {
    headers: {
      'Content-Type': contentType,
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'private, no-store',
    },
  })
}
