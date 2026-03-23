import type { NextApiRequest, NextApiResponse } from 'next'
import { getTokenFromRequest, verifyToken } from '@/lib/auth'
import prisma from '@/lib/prisma'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'PUT, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  res.setHeader('Access-Control-Allow-Credentials', 'true')
  res.setHeader('Cross-Origin-Opener-Policy', 'unsafe-none')

  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'PUT') return res.status(405).json({ error: 'Method not allowed' })

  const token = getTokenFromRequest(req as any)
  const decoded = verifyToken(token || '')
  if (!token || !decoded) return res.status(401).json({ error: 'Unauthorized' })

  const { id } = req.query

  try {
    const notification = await prisma.notification.findFirst({
      where: { id: id as string, employeeId: decoded.id },
    })
    if (!notification) {
      return res.status(404).json({ error: 'Notification not found' })
    }

    const updated = await prisma.notification.update({
      where: { id: id as string },
      data: { isRead: true, readAt: new Date() },
    })
    return res.status(200).json({ data: updated })
  } catch (error) {
    console.error('Error marking notification as read:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
