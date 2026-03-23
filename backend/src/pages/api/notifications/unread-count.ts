import type { NextApiRequest, NextApiResponse } from 'next'
import { getTokenFromRequest, verifyToken } from '@/lib/auth'
import prisma from '@/lib/prisma'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  res.setHeader('Access-Control-Allow-Credentials', 'true')
  res.setHeader('Cross-Origin-Opener-Policy', 'unsafe-none')

  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  const token = getTokenFromRequest(req as any)
  const decoded = verifyToken(token || '')
  if (!token || !decoded) return res.status(401).json({ error: 'Unauthorized' })

  try {
    const count = await prisma.notification.count({
      where: { employeeId: decoded.id, isRead: false },
    })
    return res.status(200).json({ data: { count } })
  } catch (error) {
    console.error('Error fetching unread count:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
