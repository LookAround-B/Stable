import type { NextApiRequest, NextApiResponse } from 'next'
import { handleCorsAndPreflight } from '@/lib/cors'
import prisma from '@/lib/prisma'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (handleCorsAndPreflight(req, res)) return;if (req.method === 'GET') {
    return handleGet(req, res)
  } else if (req.method === 'POST') {
    return handlePost(req, res)
  } else {
    return res.status(405).json({ error: 'Method not allowed' })
  }
}

async function handleGet(req: NextApiRequest, res: NextApiResponse) {
  try {
    const authHeader = req.headers.authorization
    if (!authHeader) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    const { employeeId, startDate, endDate, shift } = req.query

    let whereClause: any = {}

    if (employeeId) {
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
    const authHeader = req.headers.authorization
    if (!authHeader) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    const { employeeId, timeIn, timeOut, shift, notes } = req.body

    // Validate required fields
    if (!employeeId || !timeIn) {
      return res.status(400).json({ error: 'employeeId and timeIn are required' })
    }

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
        timeIn: new Date(timeIn),
        timeOut: timeOut ? new Date(timeOut) : null,
        shift: shift || null,
        notes: notes || null,
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

