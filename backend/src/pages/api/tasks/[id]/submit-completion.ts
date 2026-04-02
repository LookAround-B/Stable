// pages/api/tasks/[id]/submit-completion.ts
import type { NextApiRequest, NextApiResponse } from 'next'
import { getTokenFromRequest, verifyToken } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { setCorsHeaders } from '@/lib/cors'
import { sanitizeString, isValidString } from '@/lib/validate'
import { createNotificationAndPublish } from '@/lib/notificationRealtime'
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const origin = req.headers.origin
  setCorsHeaders(res, origin as string | undefined)

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
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
    const { proofImage, completionNotes } = req.body
    const userId = decoded.id

    if (!id || typeof id !== 'string') {
      return res.status(400).json({ error: 'Invalid task ID' })
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

    // If task requires proof, proofImage must be provided
    if (task.requiredProof && !proofImage) {
      return res.status(400).json({ error: 'Photo evidence is required for this task' })
    }

    if (proofImage && (typeof proofImage !== 'string' || proofImage.length > 2000)) {
      return res.status(400).json({ error: 'Invalid proofImage URL' })
    }
    if (completionNotes && !isValidString(completionNotes, 0, 2000)) {
      return res.status(400).json({ error: 'Completion notes must be max 2000 chars' })
    }

    // Update task with completion data
    const updatedTask = await prisma.task.update({
      where: { id },
      data: {
        status: 'Pending Review',
        proofImage: proofImage || undefined,
        completionNotes: completionNotes ? sanitizeString(completionNotes) : undefined,
        submittedAt: new Date(),
        completedTime: new Date(),
      },
      include: {
        horse: true,
        assignedEmployee: true,
        createdBy: true,
      },
    })

    // Notify the task creator that submission is pending review
    try {
      const employeeName = task.assignedEmployee?.fullName || 'An employee'
      await createNotificationAndPublish({
        employeeId: task.createdById,
        type: 'task_completion',
        title: `Task submitted for review: ${task.name}`,
        message: `${employeeName} has completed "${task.name}" and submitted it for your approval.`,
        relatedTaskId: task.id,
      })
    } catch (notifErr) {
      console.error('Failed to create task completion notification:', notifErr)
    }

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
