import type { NextApiRequest, NextApiResponse } from 'next'
import { getTokenFromRequest, verifyToken } from '@/lib/auth'
import { rememberJson } from '@/lib/cache'
import { cacheKeys, CACHE_TTL_SECONDS } from '@/lib/cacheKeys'
import prisma from '@/lib/prisma'
import { setCorsHeaders } from '@/lib/cors'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const origin = req.headers.origin
  setCorsHeaders(res, origin as string | undefined)

  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const token = getTokenFromRequest(req as any)
  const decoded = verifyToken(token || '')
  if (!token || !decoded) return res.status(401).json({ error: 'Unauthorized' })

  try {
    const count = await rememberJson(
      cacheKeys.notificationsUnreadCount(decoded.id),
      CACHE_TTL_SECONDS.notificationsUnreadCount,
      async () =>
        prisma.notification.count({
          where: { employeeId: decoded.id, isRead: false },
        })
    )

    return res.status(200).json({ data: { count } })
  } catch (error) {
    console.error('Error fetching unread count:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
