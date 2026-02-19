// pages/api/auth/me.ts
import type { NextApiRequest, NextApiResponse } from 'next'
import { getTokenFromRequest, verifyToken } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { runMiddleware } from '@/lib/cors'
import cors from 'cors'

const corsOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',').map(origin => origin.trim())
  : ['http://localhost:3001', 'http://localhost:3002', 'http://localhost:3000'];

const corsMiddleware = cors({
  origin: corsOrigins,
  credentials: true,
})

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Run CORS middleware
  await runMiddleware(req, res, corsMiddleware)

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const token = getTokenFromRequest(req)

    if (!token) {
      return res.status(401).json({ error: 'Access token required' })
    }

    const decoded = verifyToken(token)

    if (!decoded) {
      return res.status(403).json({ error: 'Invalid or expired token' })
    }

    const user = await prisma.employee.findUnique({
      where: { id: decoded.id },
      select: {
        id: true,
        email: true,
        fullName: true,
        designation: true,
        department: true,
        phoneNumber: true,
        isApproved: true,
        profileImage: true,
      },
    })

    if (!user) {
      return res.status(404).json({ error: 'User not found' })
    }

    return res.status(200).json(user)
  } catch (error) {
    console.error('Auth error:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
