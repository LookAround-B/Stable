// pages/api/tasks/[id].ts
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
                designation: true
              }
            }
          }
        }
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

    if (!id) {
      return res.status(400).json({ error: 'Task ID is required' })
    }

    // Validate status
    const validStatuses = ['Pending', 'In Progress', 'Completed', 'Pending Review', 'Approved', 'Rejected', 'Cancelled']
    if (status && !validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status' })
    }

    const updateData: any = {}
    if (status) updateData.status = status
    if (completionNotes) updateData.completionNotes = completionNotes
    if (photoUrl) updateData.proofImage = photoUrl
    if (status === 'Completed' || status === 'Pending Review') {
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
                designation: true
              }
            }
          }
        }
      },
    })

    // Create approval record if status is Approved or Rejected
    if ((status === 'Approved' || status === 'Rejected') && userId) {
      await prisma.approval.upsert({
        where: {
          taskId_approverId: {
            taskId: id as string,
            approverId: userId,
          },
        },
        update: {
          status: status === 'Approved' ? 'Approved' : 'Rejected',
        },
        create: {
          taskId: id as string,
          approverId: userId,
          status: status === 'Approved' ? 'Approved' : 'Rejected',
          approverLevel: 'Admin',
        },
      })

      // Refresh task to include the new approval
      const updatedTask = await prisma.task.findUnique({
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
                  designation: true
                }
              }
            }
          }
        },
      })

      return res.status(200).json(updatedTask)
    }

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
