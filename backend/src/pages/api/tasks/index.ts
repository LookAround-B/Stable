// pages/api/tasks/index.ts
import type { NextApiRequest, NextApiResponse } from 'next'
import {
  checkPermission,
  getTaskCapabilitiesForUser,
  getTokenFromRequest,
  verifyToken,
} from '@/lib/auth'
import { rememberJson } from '@/lib/cache'
import {
  cacheKeys,
  CACHE_TTL_SECONDS,
  invalidateTaskCaches,
} from '@/lib/cacheKeys'
import prisma from '@/lib/prisma'
import { setCorsHeaders } from '@/lib/cors'
import { createNotificationAndPublish } from '@/lib/notificationRealtime'
import { taskListSelect } from '@/lib/taskPayload'
import { safePositiveInt } from '@/lib/validate'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const origin = req.headers.origin
  setCorsHeaders(res, origin as string | undefined)

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  // Check authentication
  const token = getTokenFromRequest(req as any)
  if (!token || !verifyToken(token)) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  switch (req.method) {
    case 'GET':
      return handleGetTasks(req, res)
    case 'POST':
      return handleCreateTask(req, res)
    default:
      return res.status(405).json({ error: 'Method not allowed' })
  }
}

async function handleGetTasks(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { status, horseId, skip = 0, take = 10 } = req.query
    const token = getTokenFromRequest(req as any)
    if (!token) {
      return res.status(401).json({ error: 'Unauthorized' })
    }
    const decoded = verifyToken(token)
    const userId = decoded?.id

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' })
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
    const canViewAssignedTasks =
      canCreateTasks ||
      canReviewTasks ||
      taskCapabilities.canViewTasks ||
      taskCapabilities.canWorkOnAssignedTasks

    if (!canViewAssignedTasks) {
      return res.status(403).json({
        error:
          'Task access is not enabled for your account. Ask an admin to enable the required task overrides.',
      })
    }

    const statusValue = Array.isArray(status) ? status[0] : status
    const horseIdValue = Array.isArray(horseId) ? horseId[0] : horseId
    const skipValue = safePositiveInt(skip, 0, 10000)
    const takeValue = safePositiveInt(take, 10, 100)
    const where: any = {}
    if (statusValue) where.status = statusValue
    if (horseIdValue) where.horseId = horseIdValue

    if (statusValue === 'Pending Review' && canReviewTasks) {
      // Reviewers can see all pending submissions.
    } else if (canCreateTasks || canReviewTasks) {
      where.OR = [
        { createdById: userId },
        { assignedEmployeeId: userId },
      ]
    } else {
      where.assignedEmployeeId = userId
    }

    const payload = await rememberJson(
      cacheKeys.tasksList(userId, {
        status: statusValue ?? null,
        horseId: horseIdValue ?? null,
        skip: skipValue,
        take: takeValue,
      }),
      CACHE_TTL_SECONDS.tasksList,
      async () => {
        const [tasks, total] = await Promise.all([
          prisma.task.findMany({
            where,
            skip: skipValue,
            take: takeValue,
            select: taskListSelect,
            orderBy: { scheduledTime: 'desc' },
          }),
          prisma.task.count({ where }),
        ])

        return {
          data: tasks,
          pagination: { total, skip: skipValue, take: takeValue },
        }
      }
    )

    return res.status(200).json(payload)
  } catch (error) {
    console.error('Error fetching tasks:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}

async function handleCreateTask(req: NextApiRequest, res: NextApiResponse) {
  try {
    const token = getTokenFromRequest(req as any)
    if (!token) {
      return res.status(401).json({ error: 'Unauthorized' })
    }
    const decoded = verifyToken(token)
    const userId = decoded?.id

    if (!userId || !decoded) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    try {
      const canManageSchedules = await checkPermission(decoded, 'manageSchedules')
      const taskCapabilities = await getTaskCapabilitiesForUser(
        decoded.id,
        decoded.designation
      )
      const allowed = canManageSchedules || taskCapabilities.canCreateTasks
      if (!allowed) {
        return res.status(403).json({
          error:
            'Task creation is not enabled for your account. Ask an admin to enable task assignment access.',
        })
      }
    } catch (permErr) {
      console.error('Permission check failed:', permErr)
      return res.status(500).json({ error: 'Failed to verify permissions. Please try again.' })
    }

    const {
      name,
      type,
      horseId,
      assignedEmployeeId,
      scheduledTime,
      priority,
      requiredProof,
      description,
    } = req.body

    if (!name || !type || !assignedEmployeeId || !scheduledTime) {
      return res.status(400).json({ error: 'Missing required fields: name, type, assignedEmployeeId, scheduledTime' })
    }

    // Validate string fields
    if (typeof name !== 'string' || name.trim().length < 1 || name.length > 200) {
      return res.status(400).json({ error: 'Task name must be 1-200 characters' })
    }
    if (typeof type !== 'string' || type.trim().length < 1 || type.length > 100) {
      return res.status(400).json({ error: 'Task type must be 1-100 characters' })
    }
    if (description && (typeof description !== 'string' || description.length > 2000)) {
      return res.status(400).json({ error: 'Description must be under 2000 characters' })
    }

    // Validate priority enum
    const validPriorities = ['Low', 'Medium', 'High', 'Urgent']
    if (priority && !validPriorities.includes(priority)) {
      return res.status(400).json({ error: `Priority must be one of: ${validPriorities.join(', ')}` })
    }

    // Validate date
    const parsedScheduled = new Date(scheduledTime)
    if (isNaN(parsedScheduled.getTime())) {
      return res.status(400).json({ error: 'Invalid scheduledTime date' })
    }

    const sanitize = (s: string) => s.replace(/<[^>]*>/g, '').trim()

    const task = await prisma.task.create({
      data: {
        name: sanitize(name),
        type: sanitize(type),
        horseId: horseId && horseId.trim() ? horseId : null, // Convert empty string to null
        assignedEmployeeId,
        createdById: userId,
        scheduledTime: parsedScheduled,
        priority: priority || 'Medium',
        requiredProof: requiredProof === true || requiredProof === 'true',
        description: description ? sanitize(description) : undefined,
        status: 'Pending',
      },
      select: taskListSelect,
    })

    await invalidateTaskCaches(task.id)

    // Create notification for the assigned employee
    try {
      const scheduledStr = parsedScheduled.toLocaleString('en-IN', {
        day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
      })
      await createNotificationAndPublish({
        employeeId: assignedEmployeeId,
        type: 'task_assignment',
        title: `New task assigned: ${sanitize(name)}`,
        message: `You have been assigned a new task scheduled for ${scheduledStr}. Priority: ${priority || 'Medium'}.`,
        relatedTaskId: task.id,
      })
    } catch (notifErr) {
      // Non-fatal: task was created, just log the notification failure
      console.error('Failed to create task assignment notification:', notifErr)
    }

    return res.status(201).json(task)
  } catch (error) {
    console.error('Error creating task:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
