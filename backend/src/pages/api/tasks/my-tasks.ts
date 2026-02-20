// pages/api/tasks/my-tasks.ts
import type { NextApiRequest, NextApiResponse } from 'next'
import { getTokenFromRequest, verifyToken } from '@/lib/auth'
import prisma from '@/lib/prisma'
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
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

    const userId = decoded.id
    const { status, skip = 0, take = 1000 } = req.query

    const where: any = {
      assignedEmployeeId: userId, // Get tasks assigned to the current user
    }

    if (status) {
      where.status = status
    }

    const tasks = await prisma.task.findMany({
      where,
      skip: parseInt(skip as string),
      take: parseInt(take as string),
      include: {
        horse: true,
        assignedEmployee: true,
        createdBy: true,
        approvals: {
          include: {
            approver: {
              select: {
                id: true,
                fullName: true,
                email: true,
                designation: true
              }
            }
          }
        }
      },
      orderBy: { scheduledTime: 'desc' },
    })

    const total = await prisma.task.count({ where })

    return res.status(200).json({
      success: true,
      data: tasks,
      pagination: { total, skip, take },
    })
  } catch (error) {
    console.error('Error fetching my tasks:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}

