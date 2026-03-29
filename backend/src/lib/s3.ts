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
    // Sanitize folder path — strip leading/trailing slashes and reject path traversal
    const sanitizedFolder = folderPath.replace(/^\/+|\/+$/g, '').replace(/\.\./g, '')
    if (!sanitizedFolder || /[^a-zA-Z0-9_\-/]/.test(sanitizedFolder)) {
      throw new Error('Invalid folder path')
    }

    // Extract file extension safely — strip path components from filename
    const baseName = filename.split('/').pop()?.split('\\').pop() || 'file'
    const ext = baseName.split('.').pop()?.toLowerCase().replace(/[^a-z0-9]/g, '') || 'bin'
    // Generate safe filename without special characters
    const uniqueName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`
    const key = `${sanitizedFolder}/${uniqueName}`

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
 * Only allows image mimetypes (JPEG, PNG, GIF, WebP) unless extraMimes are specified.
 */
const ALLOWED_BASE64_MIMES = new Set([
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/svg+xml',
])

export const uploadBase64Image = async (
  base64: string,
  folder: string,
  extraAllowedMimes: string[] = []
): Promise<string> => {
  if (!process.env.R2_ENDPOINT || !process.env.R2_ACCESS_KEY_ID) {
    // R2 not configured – fall back to storing base64 as-is
    return base64
  }

  // Strip the data-URI prefix if present (data:image/jpeg;base64,…)
  const matches = base64.match(/^data:([a-zA-Z0-9+/.-]+\/[a-zA-Z0-9+/.-]+);base64,(.+)$/)
  let mimeType = 'image/jpeg'
  let raw = base64
  if (matches) {
    mimeType = matches[1]
    raw = matches[2]
  }

  // Validate mime type against allowlist
  const allowSet = new Set([...ALLOWED_BASE64_MIMES, ...extraAllowedMimes])
  if (!allowSet.has(mimeType.toLowerCase())) {
    throw new Error(`Disallowed file type: ${mimeType}. Allowed: ${[...allowSet].join(', ')}`)
  }

  const ext = mimeType.split('/')[1]?.replace('jpeg', 'jpg') || 'jpg'
  const buffer = Buffer.from(raw, 'base64')

  // Reject suspiciously large uploads (10 MB hard limit)
  if (buffer.length > 10 * 1024 * 1024) {
    throw new Error('File exceeds 10 MB limit')
  }

  const url = await uploadImage(buffer, `photo.${ext}`, mimeType, folder)
  return url
}

