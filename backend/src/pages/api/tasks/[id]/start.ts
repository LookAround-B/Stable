// pages/api/tasks/[id]/start.ts
import type { NextApiRequest, NextApiResponse } from 'next'
import {
  checkPermission,
  getTaskCapabilitiesForUser,
  getTokenFromRequest,
  verifyToken,
} from '@/lib/auth'
import prisma from '@/lib/prisma'
import { setCorsHeaders } from '@/lib/cors'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const origin = req.headers.origin
  setCorsHeaders(res, origin as string | undefined)

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  if (req.method !== 'PATCH') {
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

    const { id } = req.query
    const userId = decoded.id

    if (!id || typeof id !== 'string') {
      return res.status(400).json({ error: 'Invalid task ID' })
    }

    const task = await prisma.task.findUnique({
      where: { id },
    })

    if (!task) {
      return res.status(404).json({ error: 'Task not found' })
    }

    const canManageSchedules = await checkPermission(decoded, 'manageSchedules')
    const taskCapabilities = await getTaskCapabilitiesForUser(
      decoded.id,
      decoded.designation
    )
    const canWorkOnAssignedTasks =
      canManageSchedules || taskCapabilities.canWorkOnAssignedTasks

    if (task.assignedEmployeeId !== userId || !canWorkOnAssignedTasks) {
      return res.status(403).json({ error: 'You are not assigned to this task' })
    }

    if (task.status !== 'Pending') {
      return res.status(400).json({ error: `Task cannot be started — current status is "${task.status}"` })
    }

    const updatedTask = await prisma.task.update({
      where: { id },
      data: { status: 'In Progress' },
      include: {
        horse: true,
        assignedEmployee: true,
        createdBy: true,
      },
    })

    return res.status(200).json({
      success: true,
      data: updatedTask,
      message: 'Task started successfully.',
    })
  } catch (error) {
    console.error('Error starting task:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
