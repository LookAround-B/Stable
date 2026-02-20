// pages/api/tasks/index.ts
import type { NextApiRequest, NextApiResponse } from 'next'
import { getTokenFromRequest, verifyToken } from '@/lib/auth'
import { handleCorsAndPreflight } from '@/lib/cors'
import prisma from '@/lib/prisma'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (handleCorsAndPreflight(req, res)) return;
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
    // For other queries: Admins see tasks they created, Groomers see tasks assigned to them
    const adminRoles = ['Super Admin', 'Director', 'School Administrator', 'Stable Manager', 'Ground Supervisor', 'Jamedar']
    
    if (status === 'Pending Review' && adminRoles.includes(user.designation)) {
      // For approval review: show all pending review tasks
      // No additional filtering - managers can see all pending review tasks regardless of who created them
    } else if (adminRoles.includes(user.designation)) {
      // Admins see tasks they created (for non-approval queries)
      where.createdById = userId
    } else {
      // Groomers and others see tasks assigned to them
      where.assignedEmployeeId = userId
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

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' })
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

    if (!name || !type || !horseId || !assignedEmployeeId || !scheduledTime) {
      return res.status(400).json({ error: 'Missing required fields' })
    }

    const task = await prisma.task.create({
      data: {
        name,
        type,
        horseId,
        assignedEmployeeId,
        createdById: userId,
        scheduledTime: new Date(scheduledTime),
        priority: priority || 'Medium',
        requiredProof: requiredProof || false,
        description,
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

