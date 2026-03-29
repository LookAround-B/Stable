// pages/api/notifications/index.ts
import type { NextApiRequest, NextApiResponse } from 'next'
import { getTokenFromRequest, verifyToken } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { setCorsHeaders } from '@/lib/cors'
import { safePositiveInt } from '@/lib/validate'
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const origin = req.headers.origin
  setCorsHeaders(res, origin as string | undefined)

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  const token = getTokenFromRequest(req as any)
  const decoded = verifyToken(token || '')
  
  if (!token || !decoded) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  switch (req.method) {
    case 'GET':
      return handleGetNotifications(req, res, decoded.id)
    case 'PUT':
      return handleMarkAsRead(req, res, decoded.id)
    default:
      return res.status(405).json({ error: 'Method not allowed' })
  }
}

async function handleGetNotifications(
  req: NextApiRequest,
  res: NextApiResponse,
  employeeId: string
) {
  try {
    const { skip = 0, take = 50 } = req.query

    const notifications = await prisma.notification.findMany({
      where: { employeeId },
      skip: safePositiveInt(skip, 0),
      take: safePositiveInt(take, 50, 200),
      orderBy: { createdAt: 'desc' },
    })

    const total = await prisma.notification.count({ where: { employeeId } })

    return res.status(200).json({
      data: notifications,
      pagination: { total, skip, take },
    })
  } catch (error) {
    console.error('Error fetching notifications:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}

async function handleMarkAsRead(
  req: NextApiRequest,
  res: NextApiResponse,
  employeeId: string
) {
  try {
    const { notificationId } = req.body

    if (!notificationId || typeof notificationId !== 'string') {
      return res.status(400).json({ error: 'notificationId is required' })
    }

    // Verify the notification belongs to the authenticated user
    const existing = await prisma.notification.findUnique({
      where: { id: notificationId },
    })

    if (!existing) {
      return res.status(404).json({ error: 'Notification not found' })
    }

    if (existing.employeeId !== employeeId) {
      return res.status(403).json({ error: 'Cannot modify another user\'s notification' })
    }

    const notification = await prisma.notification.update({
      where: { id: notificationId },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    })

    return res.status(200).json(notification)
  } catch (error) {
    console.error('Error updating notification:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}

