import type { NextApiRequest, NextApiResponse } from 'next'
import prisma from '@/lib/prisma'
import cors from 'cors'
import { runMiddleware } from '@/lib/cors'

const corsMiddleware = cors({
  origin: ['http://localhost:3001', 'http://localhost:3000'],
  credentials: true,
})

export default async function handler(req: NextApiRequest, res: NextApiResponse) {if (req.method === 'GET') {
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
      whereClause.guardId = guardId
    }

    if (personType) {
      whereClause.personType = personType // 'Staff' or 'Visitor'
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
      return res.status(400).json({ 
        error: 'guardId, personName, personType, and entryTime are required' 
      })
    }

    // Validate personType
    if (!['Staff', 'Visitor'].includes(personType)) {
      return res.status(400).json({ error: 'personType must be Staff or Visitor' })
    }

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
        personName,
        personType,
        entryTime: new Date(entryTime),
        exitTime: exitTime ? new Date(exitTime) : null,
        notes: notes || null,
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

