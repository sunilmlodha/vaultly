import { put, del } from '@vercel/blob'

export async function uploadDocument(
  filename: string,
  file: ArrayBuffer,
  userId: string
): Promise<{ url: string; pathname: string }> {
  const blob = await put(`documents/${userId}/${Date.now()}_${filename}`, file, {
    access: 'public',
    addRandomSuffix: false,
  })
  return { url: blob.url, pathname: blob.pathname }
}

export async function deleteDocument(url: string): Promise<void> {
  await del(url)
}
