// pages/api/tasks/[id]/submit-completion.ts
import type { NextApiRequest, NextApiResponse } from 'next'
import { getTokenFromRequest, verifyToken } from '@/lib/auth'
import { handleCorsAndPreflight } from '@/lib/cors'
import prisma from '@/lib/prisma'
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (handleCorsAndPreflight(req, res)) return;

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
    const { proofImage, completionNotes } = req.body
    const userId = decoded.id

    if (!id || typeof id !== 'string') {
      return res.status(400).json({ error: 'Invalid task ID' })
    }

    if (!proofImage) {
      return res.status(400).json({ error: 'Proof image is required' })
    }

    // Get the task
    const task = await prisma.task.findUnique({
      where: { id },
      include: { assignedEmployee: true, createdBy: true },
    })

    if (!task) {
      return res.status(404).json({ error: 'Task not found' })
    }

    // Verify the user is the assigned employee
    if (task.assignedEmployeeId !== userId) {
      return res.status(403).json({ error: 'You are not assigned to this task' })
    }

    // Verify task is in "In Progress" status
    if (task.status !== 'In Progress') {
      return res.status(400).json({ error: 'Task must be in progress before submission' })
    }

    // Update task with completion data
    const updatedTask = await prisma.task.update({
      where: { id },
      data: {
        status: 'Pending Review',
        proofImage,
        completionNotes,
        submittedAt: new Date(),
        completedTime: new Date(),
      },
      include: {
        horse: true,
        assignedEmployee: true,
        createdBy: true,
      },
    })

    return res.status(200).json({
      success: true,
      data: updatedTask,
      message: 'Task submitted successfully. Awaiting approval.',
    })
  } catch (error) {
    console.error('Error submitting task:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
