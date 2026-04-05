import type { NextApiRequest, NextApiResponse } from 'next'
import { getTokenFromRequest, verifyToken } from '@/lib/auth'
import { setCorsHeaders } from '@/lib/cors'
import {
  publishNotificationState,
  registerNotificationStream,
} from '@/lib/notificationRealtime'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const origin = req.headers.origin
  setCorsHeaders(res, origin as string | undefined)

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const tokenFromQuery =
    typeof req.query.token === 'string' ? req.query.token : null
  const token = tokenFromQuery || getTokenFromRequest(req as any)
  const decoded = verifyToken(token || '')

  if (!token || !decoded) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const cleanup = await registerNotificationStream(decoded.id, res)

  req.on('close', cleanup)
  req.on('aborted', cleanup)

  await publishNotificationState(decoded.id)
}

export const config = {
  api: {
    bodyParser: false,
  },
}
