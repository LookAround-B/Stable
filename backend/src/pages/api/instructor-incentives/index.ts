// pages/api/instructor-incentives/index.ts
import type { NextApiRequest, NextApiResponse } from 'next'
import { getTokenFromRequest, verifyToken } from '@/lib/auth'
import { setCorsHeaders } from '@/lib/cors'
import prisma from '@/lib/prisma'

const MINIMUM_INCENTIVE_AMOUNT = 1400

const ADMIN_DESIGNATIONS = [
  'Super Admin',
  'Director',
  'School Administrator',
  'Stable Manager',
]

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  setCorsHeaders(res, req.headers.origin as string | undefined)

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  const token = getTokenFromRequest(req as any)
  if (!token) {
    return res.status(401).json({ error: 'No authorization header' })
  }

  const decoded = verifyToken(token)
  if (!decoded) {
    return res.status(401).json({ error: 'Invalid or expired token' })
  }

  switch (req.method) {
    case 'GET':
      return handleGetIncentives(req, res, decoded)
    case 'POST':
      if (!ADMIN_DESIGNATIONS.includes(decoded.designation)) {
        return res.status(403).json({ error: 'You do not have permission to manage incentives' })
      }
      return handleCreateIncentive(req, res, decoded)
    default:
      return res.status(405).json({ error: 'Method not allowed' })
  }
}

async function handleGetIncentives(
  req: NextApiRequest,
  res: NextApiResponse,
  decoded: { id: string; designation: string }
) {
  try {
    const { instructorId, status, startDate, endDate, month, year } = req.query
    const isAdmin = ADMIN_DESIGNATIONS.includes(decoded.designation)

    const where: Record<string, any> = {}

    if (!isAdmin) {
      where.instructorId = decoded.id
    } else if (instructorId) {
      where.instructorId = instructorId as string
    }

    if (status) {
      where.status = status as string
    }

    if (startDate && endDate) {
      where.date = {
        gte: new Date(startDate as string),
        lte: new Date(endDate as string),
      }
    } else if (month && year) {
      const m = parseInt(month as string)
      const y = parseInt(year as string)
      where.date = {
        gte: new Date(y, m - 1, 1),
        lte: new Date(y, m, 0, 23, 59, 59),
      }
    }

    const incentives = await prisma.instructorIncentive.findMany({
      where,
      include: {
        instructor: {
          select: { id: true, fullName: true, designation: true, profileImage: true },
        },
        approvedBy: {
          select: { id: true, fullName: true },
        },
        createdBy: {
          select: { id: true, fullName: true },
        },
      },
      orderBy: { date: 'desc' },
    })

    return res.status(200).json({ data: incentives })
  } catch (error) {
    console.error('Error fetching instructor incentives:', error)
    return res.status(500).json({ error: 'Failed to fetch incentives' })
  }
}

async function handleCreateIncentive(
  req: NextApiRequest,
  res: NextApiResponse,
  decoded: { id: string }
) {
  try {
    const { instructorId, date, amount, paymentMode, description, bookingId, lessonCount, notes } =
      req.body

    if (!instructorId || !date || !amount || !paymentMode) {
      return res
        .status(400)
        .json({ error: 'Missing required fields: instructorId, date, amount, paymentMode' })
    }

    if (parseFloat(amount) < MINIMUM_INCENTIVE_AMOUNT) {
      return res.status(400).json({
        error: `Incentive amount must be at least ₹${MINIMUM_INCENTIVE_AMOUNT}`,
      })
    }

    const instructor = await prisma.employee.findUnique({
      where: { id: instructorId },
      select: { id: true, designation: true },
    })

    if (!instructor) {
      return res.status(404).json({ error: 'Instructor not found' })
    }

    if (instructor.designation !== 'Instructor') {
      return res.status(400).json({ error: 'Selected employee is not an instructor' })
    }

    const incentive = await prisma.instructorIncentive.create({
      data: {
        instructorId,
        date: new Date(date),
        amount: parseFloat(amount),
        paymentMode,
        description: description || null,
        bookingId: bookingId || null,
        lessonCount: parseInt(lessonCount) || 0,
        notes: notes || null,
        createdById: decoded.id,
        status: 'Pending',
      },
      include: {
        instructor: {
          select: { id: true, fullName: true, designation: true },
        },
        createdBy: {
          select: { id: true, fullName: true },
        },
      },
    })

    return res.status(201).json({ data: incentive, message: 'Incentive created successfully' })
  } catch (error) {
    console.error('Error creating instructor incentive:', error)
    return res.status(500).json({ error: 'Failed to create incentive' })
  }
}
