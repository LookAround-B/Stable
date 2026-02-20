// pages/api/meetings/[id].ts
import type { NextApiRequest, NextApiResponse } from 'next'
import { getTokenFromRequest, verifyToken } from '@/lib/auth'
import prisma from '@/lib/prisma'
const parentRoles = ['Director', 'School Administrator', 'Stable Manager']

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Cross-Origin-Opener-Policy', 'unsafe-none');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
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
    const { id } = req.query

    if (!id || typeof id !== 'string') {
      return res.status(400).json({ error: 'Invalid meeting ID' })
    }

    if (req.method === 'GET') {
      const meeting = await prisma.meeting.findUnique({
        where: { id },
        include: {
          createdBy: {
            select: {
              id: true,
              fullName: true,
              email: true,
              designation: true,
            },
          },
          participants: {
            include: {
              employee: {
                select: {
                  id: true,
                  fullName: true,
                  email: true,
                  designation: true,
                },
              },
            },
          },
          mom: true,
        },
      })

      if (!meeting) {
        return res.status(404).json({ error: 'Meeting not found' })
      }

      return res.status(200).json({
        success: true,
        data: meeting,
      })
    } else if (req.method === 'PATCH') {
      // Update meeting (only creator or parent roles can update, only if not started)
      const meeting = await prisma.meeting.findUnique({
        where: { id },
        include: {
          createdBy: true,
        },
      })

      if (!meeting) {
        return res.status(404).json({ error: 'Meeting not found' })
      }

      const user = await prisma.employee.findUnique({
        where: { id: userId },
      })

      if (meeting.createdById !== userId && (!user || !parentRoles.includes(user.designation))) {
        return res.status(403).json({ error: 'Only creator or admin can update meeting' })
      }

      const { title, description, meetingDate, meetingTime, location, status } = req.body

      const updatedMeeting = await prisma.meeting.update({
        where: { id },
        data: {
          title,
          description,
          meetingDate: meetingDate ? new Date(meetingDate) : undefined,
          meetingTime,
          location,
          status,
        },
        include: {
          createdBy: {
            select: {
              id: true,
              fullName: true,
              email: true,
              designation: true,
            },
          },
          participants: {
            include: {
              employee: {
                select: {
                  id: true,
                  fullName: true,
                  email: true,
                  designation: true,
                },
              },
            },
          },
          mom: true,
        },
      })

      return res.status(200).json({
        success: true,
        data: updatedMeeting,
      })
    } else if (req.method === 'DELETE') {
      // Delete meeting (only creator can delete)
      const meeting = await prisma.meeting.findUnique({
        where: { id },
      })

      if (!meeting) {
        return res.status(404).json({ error: 'Meeting not found' })
      }

      if (meeting.createdById !== userId) {
        return res.status(403).json({ error: 'Only creator can delete meeting' })
      }

      await prisma.meeting.delete({
        where: { id },
      })

      return res.status(200).json({
        success: true,
        message: 'Meeting deleted successfully',
      })
    } else {
      return res.status(405).json({ error: 'Method not allowed' })
    }
  } catch (error) {
    console.error('Error in meeting details handler:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
