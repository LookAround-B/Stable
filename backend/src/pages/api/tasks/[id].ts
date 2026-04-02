import type { NextApiRequest, NextApiResponse } from 'next'
import {
  checkPermission,
  getTaskCapabilitiesForUser,
  getTokenFromRequest,
  verifyToken,
} from '@/lib/auth'
import prisma from '@/lib/prisma'
import { setCorsHeaders } from '@/lib/cors'
import { sanitizeString, isValidString, isValidId, isOneOf } from '@/lib/validate'
import {
  createNotificationAndPublish,
  publishNotificationStates,
} from '@/lib/notificationRealtime'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const origin = req.headers.origin
  setCorsHeaders(res, origin as string | undefined)

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  const token = getTokenFromRequest(req as any)
  if (!token || !verifyToken(token)) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  switch (req.method) {
    case 'GET':
      return handleGetTask(req, res)
    case 'PATCH':
      return handleUpdateTask(req, res)
    case 'DELETE':
      return handleDeleteTask(req, res)
    default:
      return res.status(405).json({ error: 'Method not allowed' })
  }
}

async function handleGetTask(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { id } = req.query

    const task = await prisma.task.findUnique({
      where: { id: id as string },
      include: {
        horse: true,
        assignedEmployee: true,
        approvals: {
          include: {
            approver: {
              select: {
                id: true,
                fullName: true,
                email: true,
                designation: true,
              },
            },
          },
        },
      },
    })

    if (!task) {
      return res.status(404).json({ error: 'Task not found' })
    }

    return res.status(200).json(task)
  } catch (error) {
    console.error('Error fetching task:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}

async function handleUpdateTask(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { id } = req.query
    const { status, completionNotes, photoUrl } = req.body
    const token = getTokenFromRequest(req as any)

    if (!token) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    const decoded = verifyToken(token)
    const userId = decoded?.id

    if (!id || !isValidId(id as string)) {
      return res.status(400).json({ error: 'Valid Task ID is required' })
    }

    const validStatuses = [
      'Pending',
      'In Progress',
      'Completed',
      'Pending Review',
      'Approved',
      'Rejected',
      'Cancelled',
    ] as const

    if (status && !isOneOf(status, validStatuses)) {
      return res.status(400).json({ error: 'Invalid status' })
    }
    if (completionNotes && !isValidString(completionNotes, 0, 2000)) {
      return res
        .status(400)
        .json({ error: 'Completion notes must be max 2000 chars' })
    }
    if (photoUrl && typeof photoUrl === 'string' && photoUrl.length > 2000) {
      return res.status(400).json({ error: 'Photo URL too long' })
    }

    if (!decoded || !userId) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    const existingTask = await prisma.task.findUnique({
      where: { id: id as string },
      include: {
        assignedEmployee: true,
        createdBy: true,
      },
    })

    if (!existingTask) {
      return res.status(404).json({ error: 'Task not found' })
    }

    const canManageSchedules = await checkPermission(decoded, 'manageSchedules')
    const taskCapabilities = await getTaskCapabilitiesForUser(
      decoded.id,
      decoded.designation
    )
    const canCreateTasks =
      canManageSchedules || taskCapabilities.canCreateTasks
    const canReviewTasks =
      canManageSchedules || taskCapabilities.canReviewTasks
    const canWorkOnAssignedTasks =
      canManageSchedules || taskCapabilities.canWorkOnAssignedTasks
    const isAssignedEmployee = existingTask.assignedEmployeeId === userId
    const requestedStatus =
      status === 'Completed' || status === 'Pending Review'
        ? 'Pending Review'
        : status

    if (!requestedStatus) {
      return res.status(400).json({ error: 'Status is required' })
    }

    if (requestedStatus === 'In Progress') {
      if (!isAssignedEmployee || !canWorkOnAssignedTasks) {
        return res.status(403).json({
          error: 'Only the assigned employee can start this task.',
        })
      }

      if (existingTask.status !== 'Pending') {
        return res.status(400).json({
          error: `Task cannot be started while it is "${existingTask.status}".`,
        })
      }
    }

    if (requestedStatus === 'Pending') {
      if (!isAssignedEmployee || !canWorkOnAssignedTasks) {
        return res.status(403).json({
          error: 'Only the assigned employee can reset this task.',
        })
      }

      if (existingTask.status !== 'In Progress') {
        return res.status(400).json({
          error: 'Only in-progress tasks can be moved back to pending.',
        })
      }
    }

    if (requestedStatus === 'Pending Review') {
      if (!isAssignedEmployee || !canWorkOnAssignedTasks) {
        return res.status(403).json({
          error:
            'Only the assigned employee can submit this task for approval.',
        })
      }

      if (existingTask.status !== 'In Progress') {
        return res.status(400).json({
          error: 'Task must be in progress before submission.',
        })
      }

      if (existingTask.requiredProof && !photoUrl) {
        return res.status(400).json({
          error: 'Photo evidence is required for this task.',
        })
      }
    }

    if (requestedStatus === 'Approved' || requestedStatus === 'Rejected') {
      if (!canReviewTasks) {
        return res.status(403).json({
          error: 'Task review is not enabled for your account.',
        })
      }

      if (
        existingTask.status !== 'Pending Review' &&
        existingTask.status !== 'Completed'
      ) {
        return res.status(400).json({
          error: 'Only submitted tasks can be approved or rejected.',
        })
      }
    }

    if (requestedStatus === 'Cancelled' && !canCreateTasks) {
      return res.status(403).json({
        error: 'Task cancellation is not enabled for your account.',
      })
    }

    const updateData: Record<string, unknown> = {}
    if (requestedStatus) updateData.status = requestedStatus
    if (completionNotes) {
      updateData.completionNotes = sanitizeString(completionNotes)
    }
    if (photoUrl) updateData.proofImage = photoUrl
    if (requestedStatus === 'Pending Review') {
      updateData.submittedAt = new Date()
      updateData.completedTime = new Date()
    }

    const task = await prisma.task.update({
      where: { id: id as string },
      data: updateData,
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
                designation: true,
              },
            },
          },
        },
      },
    })

    let responseTask: any = task
    let clearedNotificationRecipients: string[] = []

    if ((requestedStatus === 'Approved' || requestedStatus === 'Rejected') && userId) {
      clearedNotificationRecipients = (
        await prisma.notification.findMany({
          where: {
            relatedTaskId: id as string,
            type: 'task_completion',
            isRead: false,
          },
          select: { employeeId: true },
        })
      ).map((notification) => notification.employeeId)

      await prisma.approval.upsert({
        where: {
          taskId_approverId: {
            taskId: id as string,
            approverId: userId,
          },
        },
        update: {
          status: requestedStatus === 'Approved' ? 'Approved' : 'Rejected',
        },
        create: {
          taskId: id as string,
          approverId: userId,
          status: requestedStatus === 'Approved' ? 'Approved' : 'Rejected',
          approverLevel: 'Admin',
        },
      })

      responseTask = await prisma.task.findUnique({
        where: { id: id as string },
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
                  designation: true,
                },
              },
            },
          },
        },
      })
    }

    if (requestedStatus === 'Pending Review') {
      try {
        const employeeName =
          existingTask.assignedEmployee?.fullName || 'An employee'
        await createNotificationAndPublish({
          employeeId: existingTask.createdById,
          type: 'task_completion',
          title: `Task submitted for review: ${existingTask.name}`,
          message: `${employeeName} has completed "${existingTask.name}" and submitted it for your approval.`,
          relatedTaskId: id as string,
        })
      } catch (notifErr) {
        console.error(
          '[NOTIF] Failed to create task completion notification:',
          notifErr
        )
      }
    }

    if (requestedStatus === 'Approved' || requestedStatus === 'Rejected') {
      try {
        await prisma.notification.updateMany({
          where: {
            relatedTaskId: id as string,
            type: 'task_completion',
            isRead: false,
          },
          data: { isRead: true, readAt: new Date() },
        })

        await publishNotificationStates(clearedNotificationRecipients)

        const employeeMsg =
          requestedStatus === 'Approved'
            ? `Your task "${task.name}" has been approved. Great work!`
            : `Your task "${task.name}" was rejected. Please check with your supervisor.`

        await createNotificationAndPublish({
          employeeId: task.assignedEmployeeId,
          type: requestedStatus === 'Approved' ? 'approval_request' : 'general',
          title: `Task ${requestedStatus}: ${task.name}`,
          message: employeeMsg,
          relatedTaskId: id as string,
        })
      } catch (notifErr) {
        console.error(
          '[NOTIF] Failed to handle approval notifications:',
          notifErr
        )
      }
    }

    return res.status(200).json(responseTask || task)
  } catch (error) {
    console.error('Error updating task:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}

async function handleDeleteTask(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { id } = req.query

    if (!id) {
      return res.status(400).json({ error: 'Task ID is required' })
    }

    const token = getTokenFromRequest(req as any)
    if (!token) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    const decoded = verifyToken(token)
    if (!decoded) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    const canManageSchedules = await checkPermission(decoded, 'manageSchedules')
    const taskCapabilities = await getTaskCapabilitiesForUser(
      decoded.id,
      decoded.designation
    )

    if (!canManageSchedules && !taskCapabilities.canCreateTasks) {
      return res.status(403).json({
        error: 'Task deletion is not enabled for your account.',
      })
    }

    await prisma.task.delete({
      where: { id: id as string },
    })

    return res.status(200).json({ message: 'Task deleted successfully' })
  } catch (error) {
    console.error('Error deleting task:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
