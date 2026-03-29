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

  // Authenticate all requests with proper JWT verification
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
    const { employeeId, startDate, endDate, shift } = req.query

    let whereClause: any = {}

    if (employeeId) {
      if (!isValidId(employeeId)) return validationError(res, 'Invalid employeeId format')
      whereClause.employeeId = employeeId
    }

    if (startDate || endDate) {
      whereClause.date = {}
      if (startDate) {
        whereClause.date.gte = new Date(startDate as string)
      }
      if (endDate) {
        whereClause.date.lte = new Date(endDate as string)
      }
    }

    if (shift) {
      whereClause.shift = shift
    }

    const attendanceLogs = await prisma.attendanceLog.findMany({
      where: whereClause,
      include: {
        employee: {
          select: {
            id: true,
            fullName: true,
            designation: true,
            department: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    return res.status(200).json(attendanceLogs)
  } catch (error) {
    console.error('Error fetching attendance logs:', error)
    return res.status(500).json({ error: 'Failed to fetch attendance logs' })
  }
}

async function handlePost(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { employeeId, timeIn, timeOut, shift, notes } = req.body

    // Validate required fields
    if (!employeeId || !timeIn) {
      return validationError(res, 'employeeId and timeIn are required')
    }

    // Validate ID format
    if (!isValidId(employeeId)) return validationError(res, 'Invalid employeeId format')

    // Validate dates
    const parsedTimeIn = safeDate(timeIn)
    if (!parsedTimeIn) return validationError(res, 'Invalid timeIn date')
    const parsedTimeOut = timeOut ? safeDate(timeOut) : null
    if (timeOut && !parsedTimeOut) return validationError(res, 'Invalid timeOut date')

    // Validate shift if provided
    if (shift && !isOneOf(shift, ['Morning', 'Afternoon', 'Evening', 'Night'] as const)) {
      return validationError(res, 'Invalid shift value')
    }

    // Validate notes length
    if (notes && !isValidString(notes, 0, 1000)) return validationError(res, 'Notes must be under 1000 characters')

    // Check if employee exists
    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
    })

    if (!employee) {
      return res.status(404).json({ error: 'Employee not found' })
    }

    // Create attendance log
    const attendanceLog = await prisma.attendanceLog.create({
      data: {
        employeeId,
        timeIn: parsedTimeIn,
        timeOut: parsedTimeOut,
        shift: shift || null,
        notes: notes ? sanitizeString(notes) : null,
        date: new Date(),
      },
      include: {
        employee: {
          select: {
            id: true,
            fullName: true,
            designation: true,
            department: true,
          },
        },
      },
    })

    return res.status(201).json(attendanceLog)
  } catch (error) {
    console.error('Error creating attendance log:', error)
    return res.status(500).json({ error: 'Failed to create attendance log' })
  }
}

