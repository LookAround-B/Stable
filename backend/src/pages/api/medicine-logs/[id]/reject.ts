import type { NextApiRequest, NextApiResponse } from 'next'
import { getTaskCapabilitiesForUser, getTokenFromRequest, verifyToken } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { setCorsHeaders } from '@/lib/cors'
import { isValidId, isValidString, sanitizeString } from '@/lib/validate'

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

  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST'])
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

    if (!taskCapabilities.canApproveMedicineLogs) {
      return res.status(403).json({
        error: 'Medicine approval access is not enabled for your account.',
      })
    }

    const { id } = req.query
    const reason = req.body?.reason ?? req.body?.rejectionReason

    if (!id || typeof id !== 'string' || !isValidId(id)) {
      return res.status(400).json({ error: 'Invalid medicine log ID' })
    }

    if (reason && !isValidString(reason, 0, 1000)) {
      return res.status(400).json({ error: 'Reason must be max 1000 chars' })
    }

    const log = await prisma.medicineLog.findUnique({
      where: { id },
    })

    if (!log) {
      return res.status(404).json({ error: 'Medicine log not found' })
    }

    if (log.approvalStatus !== 'pending') {
      return res.status(400).json({ error: 'Only pending logs can be rejected' })
    }

    const rejectedLog = await prisma.medicineLog.update({
      where: { id },
      data: {
        approvalStatus: 'rejected',
        approvedById: decoded.id,
        rejectionReason: reason ? sanitizeString(reason) : null,
        approvalDate: new Date(),
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
        approvedBy: {
          select: {
            id: true,
            fullName: true,
            designation: true,
          },
        },
      },
    })

    return res.status(200).json(rejectedLog)
  } catch (error: any) {
    console.error('Error rejecting medicine log:', error)
    return res.status(500).json({ error: 'Failed to reject medicine log' })
  }
}
