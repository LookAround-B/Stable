// pages/api/tasks/[id].ts
import type { NextApiRequest, NextApiResponse } from 'next'
import { getTokenFromRequest, verifyToken } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { runMiddleware } from '@/lib/cors'
import cors from 'cors'

const corsMiddleware = cors({
  origin: ['http://localhost:3001', 'http://localhost:3002', 'http://localhost:3000'],
  credentials: true,
})

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Run CORS middleware
  await runMiddleware(req, res, corsMiddleware)

  // Check authentication
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
      include: { horse: true, assignedEmployee: true },
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

    if (!id) {
      return res.status(400).json({ error: 'Task ID is required' })
    }

    // Validate status
    const validStatuses = ['Pending', 'In Progress', 'Completed', 'Cancelled']
    if (status && !validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status' })
    }

    const updateData: any = {}
    if (status) updateData.status = status
    if (completionNotes) updateData.description = completionNotes // Store notes in description field
    if (photoUrl) updateData.proofImage = photoUrl // Use correct field name
    if (status === 'Completed') {
      updateData.completedTime = new Date()
    }

    const task = await prisma.task.update({
      where: { id: id as string },
      data: updateData,
      include: { horse: true, assignedEmployee: true },
    })

    return res.status(200).json(task)
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

    await prisma.task.delete({
      where: { id: id as string },
    })

    return res.status(200).json({ message: 'Task deleted successfully' })
  } catch (error) {
    console.error('Error deleting task:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
