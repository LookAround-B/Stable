// pages/api/tasks/index.ts
import type { NextApiRequest, NextApiResponse } from 'next'
import { getTokenFromRequest, verifyToken, checkPermission } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { setCorsHeaders } from '@/lib/cors'

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

    // Get user's role
    const user = await prisma.employee.findUnique({
      where: { id: userId },
    })

    if (!user) {
      return res.status(404).json({ error: 'User not found' })
    }

    const where: any = {}
    if (status) where.status = status
    if (horseId) where.horseId = horseId

    // Filter tasks based on user role
    // For approval workflow: show all tasks with "Pending Review" status
    // Admin/management roles see tasks they created + tasks assigned to them
    // Other roles see tasks assigned to them
    const adminRoles = ['Super Admin', 'Director', 'School Administrator', 'Stable Manager', 'Ground Supervisor', 'Jamedar', 'Instructor']
    
    if (status === 'Pending Review' && adminRoles.includes(user.designation)) {
      // For approval review: show all pending review tasks
      // No additional filtering - managers can see all pending review tasks regardless of who created them
    } else if (adminRoles.includes(user.designation)) {
      // Admins/Instructors see tasks they created OR tasks assigned to them
      where.OR = [
        { createdById: userId },
        { assignedEmployeeId: userId },
      ]
    } else {
      // Groomers, Riding Boys, and others see tasks assigned to them
      where.assignedEmployeeId = userId
    }

    const tasks = await prisma.task.findMany({
      where,
      skip: Math.max(0, parseInt(skip as string) || 0),
      take: Math.min(100, Math.max(1, parseInt(take as string) || 10)),
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
      data: tasks,
      pagination: { total, skip, take },
    })
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

    // Check manageSchedules permission (admins always pass)
    try {
      const allowed = await checkPermission(decoded, 'manageSchedules')
      if (!allowed) {
        return res.status(403).json({ error: 'Task creation is not enabled for your account. Ask an admin to enable the "Manage Schedules" permission.' })
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
      include: {
        horse: true,
        assignedEmployee: true,
        createdBy: true,
      },
    })

    return res.status(201).json(task)
  } catch (error) {
    console.error('Error creating task:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}

