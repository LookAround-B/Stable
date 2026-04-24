// pages/api/instructor-incentives/summary.ts
import type { NextApiRequest, NextApiResponse } from 'next'
import { getTokenFromRequest, verifyToken } from '@/lib/auth'
import { setCorsHeaders } from '@/lib/cors'
import prisma from '@/lib/prisma'

const ADMIN_DESIGNATIONS = [
  'Super Admin',
  'Director',
  'School Administrator',
  'Stable Manager',
]

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  setCorsHeaders(res, req.headers.origin as string | undefined)

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const token = getTokenFromRequest(req as any)
  if (!token) {
    return res.status(401).json({ error: 'No authorization header' })
  }

  const decoded = verifyToken(token)
  if (!decoded) {
    return res.status(401).json({ error: 'Invalid or expired token' })
  }

  try {
    const { month, year } = req.query
    const isAdmin = ADMIN_DESIGNATIONS.includes(decoded.designation)

    const where: Record<string, any> = {}

    if (!isAdmin) {
      where.instructorId = decoded.id
    }

    if (month && year) {
      const m = parseInt(month as string)
      const y = parseInt(year as string)
      where.date = {
        gte: new Date(y, m - 1, 1),
        lte: new Date(y, m, 0, 23, 59, 59),
      }
    }

    const [totalPending, totalApproved, totalPaid, totalRejected] = await Promise.all([
      prisma.instructorIncentive.aggregate({
        where: { ...where, status: 'Pending' },
        _sum: { amount: true },
        _count: true,
      }),
      prisma.instructorIncentive.aggregate({
        where: { ...where, status: 'Approved' },
        _sum: { amount: true },
        _count: true,
      }),
      prisma.instructorIncentive.aggregate({
        where: { ...where, status: 'Paid' },
        _sum: { amount: true },
        _count: true,
      }),
      prisma.instructorIncentive.aggregate({
        where: { ...where, status: 'Rejected' },
        _sum: { amount: true },
        _count: true,
      }),
    ])

    return res.status(200).json({
      data: {
        pending: { amount: totalPending._sum.amount || 0, count: totalPending._count },
        approved: { amount: totalApproved._sum.amount || 0, count: totalApproved._count },
        paid: { amount: totalPaid._sum.amount || 0, count: totalPaid._count },
        rejected: { amount: totalRejected._sum.amount || 0, count: totalRejected._count },
      },
    })
  } catch (error) {
    console.error('Error fetching incentive summary:', error)
    return res.status(500).json({ error: 'Failed to fetch summary' })
  }
}
