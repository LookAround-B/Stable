import type { NextApiRequest, NextApiResponse } from 'next'
import { getTaskCapabilitiesForUser, getTokenFromRequest, verifyToken } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { setCorsHeaders } from '@/lib/cors'

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '1mb',
    },
  },
}

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
    res.setHeader('Allow', ['GET'])
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const token = getTokenFromRequest(req as any)
    if (!token) {
      return res.status(401).json({ error: 'No authorization header' })
    }

    const decoded = verifyToken(token)
    if (!decoded) {
      return res.status(401).json({ error: 'Invalid or expired token' })
    }

    const taskCapabilities = await getTaskCapabilitiesForUser(
      decoded.id,
      decoded.designation
    )

    if (!taskCapabilities.canApproveMedicineLogs && !taskCapabilities.canViewPendingMedicineLogs) {
      return res.status(403).json({
        error: 'Medicine approval access is not enabled for your account.',
      })
    }

    const pendingLogs = await prisma.medicineLog.findMany({
      where: {
        approvalStatus: 'pending',
      },
      include: {
        jamedar: {
          select: {
            id: true,
            fullName: true,
            designation: true,
          },
        },
        horse: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    return res.status(200).json({ data: pendingLogs })
  } catch (error: any) {
    console.error('Error fetching pending medicine logs:', error)
    return res.status(500).json({ error: 'Failed to fetch pending treatment logs' })
  }
}
