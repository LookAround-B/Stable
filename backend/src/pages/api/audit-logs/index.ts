// pages/api/audit-logs/index.ts
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
  // Run CORS middlewareconst token = getTokenFromRequest(req as any)
  if (!token || !verifyToken(token)) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { userId, action, skip = 0, take = 10 } = req.query

    const where: any = {}
    if (userId) where.userId = userId
    if (action) where.action = action

    const logs = await prisma.auditLog.findMany({
      where,
      skip: parseInt(skip as string),
      take: parseInt(take as string),
      include: { user: true },
      orderBy: { createdAt: 'desc' },
    })

    const total = await prisma.auditLog.count({ where })

    return res.status(200).json({
      data: logs,
      pagination: { total, skip, take },
    })
  } catch (error) {
    console.error('Error fetching audit logs:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}

