import { put, del, presignUrl } from '@vercel/blob'

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

// Generate a short-lived signed URL for a private blob (expires in 1 hour)
export async function getSignedDownloadUrl(blobUrl: string): Promise<string> {
  return presignUrl(blobUrl, { expiresIn: 3600 })
}
