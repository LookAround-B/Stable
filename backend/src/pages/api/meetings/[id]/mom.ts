// pages/api/meetings/[id]/mom.ts
import type { NextApiRequest, NextApiResponse } from 'next'
import { getTokenFromRequest, verifyToken } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { setCorsHeaders } from '@/lib/cors'
import { sanitizeString } from '@/lib/validate'
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const origin = req.headers.origin
  setCorsHeaders(res, origin as string | undefined)

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
      // Get MOM for a meeting
      const meeting = await prisma.meeting.findUnique({
        where: { id },
        include: {
          mom: true,
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
          createdBy: {
            select: {
              id: true,
              fullName: true,
              email: true,
              designation: true,
            },
          },
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
      // Update MOM (only creator can update)
      const meeting = await prisma.meeting.findUnique({
        where: { id },
      })

      if (!meeting) {
        return res.status(404).json({ error: 'Meeting not found' })
      }

      if (meeting.createdById !== userId) {
        return res.status(403).json({ error: 'Only meeting creator can update MOM' })
      }

      const { pointsDiscussed, memberInputs, decisions } = req.body

      // Validate arrays - limit size to prevent abuse
      const maxItems = 200
      const maxItemLen = 5000
      for (const [name, arr] of [['pointsDiscussed', pointsDiscussed], ['memberInputs', memberInputs], ['decisions', decisions]] as const) {
        if (arr !== undefined) {
          if (!Array.isArray(arr) || arr.length > maxItems) {
            return res.status(400).json({ error: `${name} must be an array with at most ${maxItems} items` })
          }
          if (arr.some((item: any) => typeof item === 'string' && item.length > maxItemLen)) {
            return res.status(400).json({ error: `Each ${name} item must be at most ${maxItemLen} chars` })
          }
        }
      }

      // Sanitize string entries
      const sanitizeArr = (arr: any[]) => arr.map((item: any) =>
        typeof item === 'string' ? sanitizeString(item) : item
      )

      const safePoints = pointsDiscussed ? sanitizeArr(pointsDiscussed) : []
      const safeInputs = memberInputs ? sanitizeArr(memberInputs) : []
      const safeDecisions = decisions ? sanitizeArr(decisions) : []

      // Check if MOM exists
      let mom = await prisma.meetingMOM.findUnique({
        where: { meetingId: id },
      })

      if (!mom) {
        // Create new MOM
        mom = await prisma.meetingMOM.create({
          data: {
            meetingId: id,
            pointsDiscussed: JSON.stringify(safePoints),
            memberInputs: JSON.stringify(safeInputs),
            decisions: JSON.stringify(safeDecisions),
          },
        })
      } else {
        // Update existing MOM
        mom = await prisma.meetingMOM.update({
          where: { id: mom.id },
          data: {
            pointsDiscussed: JSON.stringify(safePoints),
            memberInputs: JSON.stringify(safeInputs),
            decisions: JSON.stringify(safeDecisions),
          },
        })
      }

      // Get updated meeting with all details
      const updatedMeeting = await prisma.meeting.findUnique({
        where: { id },
        include: {
          mom: true,
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
          createdBy: {
            select: {
              id: true,
              fullName: true,
              email: true,
              designation: true,
            },
          },
        },
      })

      return res.status(200).json({
        success: true,
        data: updatedMeeting,
      })
    } else {
      return res.status(405).json({ error: 'Method not allowed' })
    }
  } catch (error) {
    console.error('Error in MOM handler:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
