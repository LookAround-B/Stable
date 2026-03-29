import type { NextApiRequest, NextApiResponse } from 'next'
import { getTokenFromRequest, verifyToken } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { setCorsHeaders } from '@/lib/cors'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const origin = req.headers.origin
  setCorsHeaders(res, origin as string | undefined)

  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'PUT') return res.status(405).json({ error: 'Method not allowed' })

  const token = getTokenFromRequest(req as any)
  const decoded = verifyToken(token || '')
  if (!token || !decoded) return res.status(401).json({ error: 'Unauthorized' })

  try {
    await prisma.notification.updateMany({
      where: { employeeId: decoded.id, isRead: false },
      data: { isRead: true, readAt: new Date() },
    })
    return res.status(200).json({ message: 'All notifications marked as read' })
  } catch (error) {
    console.error('Error marking all as read:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
