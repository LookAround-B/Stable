// pages/api/upload.ts
import type { NextApiRequest, NextApiResponse } from 'next'
import { getTokenFromRequest, verifyToken } from '@/lib/auth'
import { uploadImage } from '@/lib/s3'
import busboy from 'busboy'
import { setCorsHeaders } from '@/lib/cors'

export const config = {
  api: {
    bodyParser: false, // Disable default bodyParser
  },
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const origin = req.headers.origin
  setCorsHeaders(res, origin as string | undefined)

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  // Check authentication
  const token = getTokenFromRequest(req as any)
  if (!token || !verifyToken(token)) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    // Parse multipart form data
    const bb = busboy({
      headers: req.headers,
      limits: {
        fileSize: 5 * 1024 * 1024, // 5MB limit
      },
    })

    let file: Buffer | null = null
    let filename = ''
    let mimetype = ''

    bb.on('file', (_fieldname, stream, info) => {
      const chunks: Buffer[] = []

      stream.on('data', (chunk) => {
        chunks.push(chunk)
      })

      stream.on('end', () => {
        file = Buffer.concat(chunks)
        filename = info.filename
        mimetype = info.mimeType
      })

      stream.on('error', (error) => {
        console.error('Stream error:', error)
      })
    })

    bb.on('error', (error) => {
      console.error('Busboy error:', error)
      return res.status(400).json({ error: 'Upload error' })
    })

    bb.on('close', async () => {
      try {
        if (!file || !filename) {
          return res.status(400).json({ error: 'No file uploaded' })
        }

        // Validate file type against strict allowlist
        const allowedMimes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
        if (!mimetype || !allowedMimes.includes(mimetype.toLowerCase())) {
          return res.status(400).json({ error: `Only image files are allowed (${allowedMimes.join(', ')})` })
        }

        // Upload to S3
        const url = await uploadImage(file, filename, mimetype, 'task-evidence')

        return res.status(200).json({ url })
      } catch (error) {
        console.error('Error uploading file:', error)
        return res.status(500).json({ error: 'Failed to upload file' })
      }
    })

    req.pipe(bb)
  } catch (error) {
    console.error('Error processing upload:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}

