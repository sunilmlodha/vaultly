import { put, del } from '@vercel/blob'

export async function uploadDocument(
  filename: string,
  file: ArrayBuffer,
  userId: string
): Promise<{ url: string; pathname: string }> {
  const blob = await put(`documents/${userId}/${Date.now()}_${filename}`, file, {
    access: 'private', // Store is private — never use public access
    addRandomSuffix: false,
  })
  return { url: blob.url, pathname: blob.pathname }
}

export async function deleteDocument(url: string): Promise<void> {
  await del(url)
}

// Fetch a private blob server-side using the read-write token
export async function fetchPrivateBlob(blobUrl: string): Promise<Response> {
  const token = process.env.BLOB_READ_WRITE_TOKEN
  if (!token) throw new Error('BLOB_READ_WRITE_TOKEN is not set')
  return fetch(blobUrl, {
    headers: { Authorization: `Bearer ${token}` },
  })
}
