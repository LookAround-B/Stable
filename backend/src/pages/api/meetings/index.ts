// pages/api/meetings/index.ts
import type { NextApiRequest, NextApiResponse } from 'next'
import { getTokenFromRequest, verifyToken } from '@/lib/auth'
import prisma from '@/lib/prisma'
const parentRoles = ['Director', 'School Administrator', 'Stable Manager']

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
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

    if (req.method === 'GET') {
      // Get all meetings for the current user (created or participating)
      const { status } = req.query

      const where: any = {
        OR: [
          { createdById: userId }, // Meetings created by user
          { participants: { some: { employeeId: userId } } }, // Meetings user participates in
        ],
      }

      if (status) {
        where.status = status
      }

      // Fetch all meetings first (no date filter at DB level)
      const meetings = await prisma.meeting.findMany({
        where,
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
        orderBy: { meetingDate: 'desc' },
      })

      return res.status(200).json({
        success: true,
        data: meetings,
      })
    } else if (req.method === 'POST') {
      // Create a new meeting (only parent roles)
      const user = await prisma.employee.findUnique({
        where: { id: userId },
      })

      if (!user || !parentRoles.includes(user.designation)) {
        return res.status(403).json({ error: 'Only parent roles can create meetings' })
      }

      const { title, description, meetingDate, meetingTime, location, participantIds = [] } = req.body

      if (!title || !meetingDate) {
        return res.status(400).json({ error: 'Title and meeting date are required' })
      }

      // Create meeting with participants
      const meeting = await prisma.meeting.create({
        data: {
          title,
          description,
          meetingDate: new Date(meetingDate),
          meetingTime,
          location,
          createdById: userId,
          participants: {
            create: participantIds.map((empId: string) => ({
              employeeId: empId,
            })),
          },
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

      return res.status(201).json({
        success: true,
        data: meeting,
      })
    } else {
      return res.status(405).json({ error: 'Method not allowed' })
    }
  } catch (error) {
    console.error('Error in meetings handler:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}

