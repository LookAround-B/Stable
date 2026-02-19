// pages/api/notifications/index.ts
import type { NextApiRequest, NextApiResponse } from 'next'
import { getTokenFromRequest, verifyToken } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { runMiddleware } from '@/lib/cors'
import cors from 'cors'

const corsMiddleware = cors({
  origin: ['http://localhost:3001', 'http://localhost:3002', 'http://localhost:3000'],
  credentials: true,
})

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Run CORS middleware
  await runMiddleware(req, res, corsMiddleware)

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
    const { skip = 0, take = 10 } = req.query

    const notifications = await prisma.notification.findMany({
      where: { employeeId },
      skip: parseInt(skip as string),
      take: parseInt(take as string),
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
  _employeeId: string
) {
  try {
    const { notificationId } = req.body

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
