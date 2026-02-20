// pages/api/meetings/[id]/participants.ts
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

    if (req.method === 'POST') {
      // Add participant to meeting
      const { employeeId } = req.body

      if (!employeeId) {
        return res.status(400).json({ error: 'Employee ID is required' })
      }

      const meeting = await prisma.meeting.findUnique({
        where: { id },
      })

      if (!meeting) {
        return res.status(404).json({ error: 'Meeting not found' })
      }

      // Only creator or admin can add participants
      const user = await prisma.employee.findUnique({
        where: { id: userId },
      })

      if (meeting.createdById !== userId && (!user || !parentRoles.includes(user.designation))) {
        return res.status(403).json({ error: 'Only creator or admin can add participants' })
      }

      // Check if employee exists
      const employee = await prisma.employee.findUnique({
        where: { id: employeeId },
      })

      if (!employee) {
        return res.status(404).json({ error: 'Employee not found' })
      }

      // Check if already a participant
      const existingParticipant = await prisma.meetingParticipant.findUnique({
        where: {
          meetingId_employeeId: {
            meetingId: id,
            employeeId: employeeId,
          },
        },
      })

      if (existingParticipant) {
        return res.status(400).json({ error: 'Employee is already a participant' })
      }

      // Add participant
      const participant = await prisma.meetingParticipant.create({
        data: {
          meetingId: id,
          employeeId: employeeId,
        },
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
      })

      return res.status(201).json({
        success: true,
        data: participant,
      })
    } else if (req.method === 'DELETE') {
      // Remove participant from meeting
      const { employeeId } = req.query

      if (!employeeId || typeof employeeId !== 'string') {
        return res.status(400).json({ error: 'Employee ID is required' })
      }

      const meeting = await prisma.meeting.findUnique({
        where: { id },
      })

      if (!meeting) {
        return res.status(404).json({ error: 'Meeting not found' })
      }

      // Only creator or admin can remove participants
      const user = await prisma.employee.findUnique({
        where: { id: userId },
      })

      if (meeting.createdById !== userId && (!user || !parentRoles.includes(user.designation))) {
        return res.status(403).json({ error: 'Only creator or admin can remove participants' })
      }

      // Remove participant
      await prisma.meetingParticipant.delete({
        where: {
          meetingId_employeeId: {
            meetingId: id,
            employeeId: employeeId,
          },
        },
      })

      return res.status(200).json({
        success: true,
        message: 'Participant removed successfully',
      })
    } else {
      return res.status(405).json({ error: 'Method not allowed' })
    }
  } catch (error) {
    console.error('Error in participants handler:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
