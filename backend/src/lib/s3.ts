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
    // Generate unique filename
    const uniqueName = `${Date.now()}-${Math.random().toString(36).substring(7)}-${filename}`
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

