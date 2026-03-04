// Cloudflare R2 Storage Utilities
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3'

// Initialize R2 client
const r2 = new S3Client({
  region: 'auto',
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || '',
  },
})

const bucket = process.env.R2_BUCKET || 'horsestable-storage'

export const uploadImage = async (
  buffer: Buffer,
  filename: string,
  mimetype: string,
  folderPath: string
): Promise<string> => {
  try {
    // Extract file extension safely
    const ext = filename.split('.').pop()?.toLowerCase() || 'bin'
    // Generate safe filename without special characters
    const uniqueName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`
    const key = `${folderPath}/${uniqueName}`

    // Upload to R2
    await r2.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: buffer,
        ContentType: mimetype,
      })
    )

    // Return public R2 URL
    const publicUrl = `${process.env.R2_PUBLIC_URL}/${key}`
    return publicUrl
  } catch (error) {
    console.error('Error uploading to R2:', error)
    throw error
  }
}

export const deleteImage = async (imageUrl: string): Promise<void> => {
  try {
    // Extract key from URL
    const urlPath = new URL(imageUrl).pathname
    const key = urlPath.replace(`/${bucket}/`, '')

    // Delete from R2
    await r2.send(
      new DeleteObjectCommand({
        Bucket: bucket,
        Key: key,
      })
    )
  } catch (error) {
    console.error('Error deleting from R2:', error)
  }
}

/**
 * Accept a data-URI or plain base64 string, upload it to R2 and return the public CDN URL.
 * Returns the original string unchanged if R2 is not configured.
 */
export const uploadBase64Image = async (
  base64: string,
  folder: string
): Promise<string> => {
  if (!process.env.R2_ENDPOINT || !process.env.R2_ACCESS_KEY_ID) {
    // R2 not configured – fall back to storing base64 as-is
    return base64
  }

  // Strip the data-URI prefix if present (data:image/jpeg;base64,…)
  const matches = base64.match(/^data:([a-zA-Z0-9+/]+\/[a-zA-Z0-9+/]+);base64,(.+)$/)
  let mimeType = 'image/jpeg'
  let raw = base64
  if (matches) {
    mimeType = matches[1]
    raw = matches[2]
  }

  const ext = mimeType.split('/')[1]?.replace('jpeg', 'jpg') || 'jpg'
  const buffer = Buffer.from(raw, 'base64')
  const url = await uploadImage(buffer, `photo.${ext}`, mimeType, folder)
  return url
}

