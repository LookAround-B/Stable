// pages/api/auth/me.ts
import type { NextApiRequest, NextApiResponse } from 'next'
import { getTokenFromRequest, getTaskCapabilitiesForUser, verifyToken } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { setCorsHeaders } from '@/lib/cors'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const origin = req.headers.origin as string | undefined
  setCorsHeaders(res, origin)

  // Handle OPTIONS preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).json({ ok: true });
  }

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
        permissions: {
          select: {
            manageEmployees: true,
            viewReports: true,
            issueFines: true,
            manageInventory: true,
            manageSchedules: true,
            viewPayroll: true,
          },
        },
      },
    })

    if (!user) {
      return res.status(404).json({ error: 'User not found' })
    }

    const taskCapabilities = await getTaskCapabilitiesForUser(
      user.id,
      user.designation
    )

    return res.status(200).json({
      ...user,
      taskCapabilities,
    })
  } catch (error) {
    console.error('Auth error:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
