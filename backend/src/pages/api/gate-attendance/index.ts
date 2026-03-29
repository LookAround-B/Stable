import type { NextApiRequest, NextApiResponse } from 'next'

import prisma from '@/lib/prisma'
import { getTokenFromRequest, verifyToken } from '@/lib/auth'
import { setCorsHeaders } from '@/lib/cors'
import {
  sanitizeString,
  isValidString,
  isValidId,
  isOneOf,
  safeDate,
  validationError,
} from '@/lib/validate'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const origin = req.headers.origin
  setCorsHeaders(res, origin as string | undefined)

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Authenticate all requests
  const token = getTokenFromRequest(req as any)
  if (!token) {
    return res.status(401).json({ error: 'No authorization header' })
  }
  const decoded = verifyToken(token)
  if (!decoded) {
    return res.status(401).json({ error: 'Invalid or expired token' })
  }

  if (req.method === 'GET') {
    return handleGet(req, res)
  } else if (req.method === 'POST') {
    return handlePost(req, res)
  } else {
    return res.status(405).json({ error: 'Method not allowed' })
  }
}

async function handleGet(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { guardId, startDate, endDate, personType } = req.query

    let whereClause: any = {}

    if (guardId) {
      if (!isValidId(guardId)) return validationError(res, 'Invalid guardId format')
      whereClause.guardId = guardId
    }

    if (personType) {
      if (!isOneOf(personType, ['Staff', 'Visitor'] as const)) {
        return validationError(res, 'personType must be Staff or Visitor')
      }
      whereClause.personType = personType
    }

    if (startDate || endDate) {
      whereClause.entryTime = {}
      if (startDate) {
        whereClause.entryTime.gte = new Date(startDate as string)
      }
      if (endDate) {
        whereClause.entryTime.lte = new Date(endDate as string)
      }
    }

    const logs = await prisma.gateAttendanceLog.findMany({
      where: whereClause,
      include: {
        guard: {
          select: {
            id: true,
            fullName: true,
            designation: true,
          },
        },
      },
      orderBy: {
        entryTime: 'desc',
      },
    })

    return res.status(200).json(logs)
  } catch (error) {
    console.error('Error fetching gate attendance logs:', error)
    return res.status(500).json({ error: 'Failed to fetch gate attendance logs' })
  }
}

async function handlePost(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { guardId, personName, personType, entryTime, exitTime, notes } = req.body

    // Validate required fields
    if (!guardId || !personName || !personType || !entryTime) {
      return validationError(res, 'guardId, personName, personType, and entryTime are required')
    }

    // Validate ID format
    if (!isValidId(guardId)) return validationError(res, 'Invalid guardId format')

    // Validate string lengths
    if (!isValidString(personName, 1, 200)) return validationError(res, 'personName must be 1-200 characters')

    // Validate personType
    if (!isOneOf(personType, ['Staff', 'Visitor'] as const)) {
      return validationError(res, 'personType must be Staff or Visitor')
    }

    // Validate dates
    const parsedEntry = safeDate(entryTime)
    if (!parsedEntry) return validationError(res, 'Invalid entryTime date')
    const parsedExit = exitTime ? safeDate(exitTime) : null
    if (exitTime && !parsedExit) return validationError(res, 'Invalid exitTime date')

    // Validate notes length
    if (notes && !isValidString(notes, 0, 1000)) return validationError(res, 'Notes must be under 1000 characters')

    // Check if guard exists
    const guard = await prisma.employee.findUnique({
      where: { id: guardId },
    })

    if (!guard || guard.designation !== 'Guard') {
      return res.status(404).json({ error: 'Guard not found' })
    }

    // Create gate attendance log
    const log = await prisma.gateAttendanceLog.create({
      data: {
        guardId,
        personName: sanitizeString(personName),
        personType,
        entryTime: parsedEntry,
        exitTime: parsedExit,
        notes: notes ? sanitizeString(notes) : null,
      },
      include: {
        guard: {
          select: {
            id: true,
            fullName: true,
            designation: true,
          },
        },
      },
    })

    return res.status(201).json(log)
  } catch (error) {
    console.error('Error creating gate attendance log:', error)
    return res.status(500).json({ error: 'Failed to create gate attendance log' })
  }
}

