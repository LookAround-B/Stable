import type { NextApiRequest, NextApiResponse } from 'next'
import { getTokenFromRequest, verifyToken } from '../../lib/auth'
import prisma from '../../lib/prisma'
import { setCorsHeaders } from '../../lib/cors'
import { sanitizeString, isValidString, isValidId, safeDate } from '../../lib/validate'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const origin = req.headers.origin
  setCorsHeaders(res, origin as string | undefined)

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  // Check authentication
  const token = getTokenFromRequest(req as any)
  if (!token || !verifyToken(token)) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  switch (req.method) {
    case 'GET':
      return handleGetWorkRecords(req, res)
    case 'POST':
      return handleCreateWorkRecord(req, res)
    default:
      res.setHeader('Allow', ['GET', 'POST', 'OPTIONS'])
      return res.status(405).json({ error: `Method ${req.method} not allowed` })
  }
}

async function handleGetWorkRecords(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { staffId, date, category, startDate, endDate } = req.query
    const where: any = {}

    if (staffId) {
      where.staffId = staffId as string
    }

    if (category) {
      where.category = category as string
    }

    if (date) {
      const dateObj = new Date(date as string)
      where.date = {
        gte: new Date(dateObj.getFullYear(), dateObj.getMonth(), dateObj.getDate()),
        lt: new Date(dateObj.getFullYear(), dateObj.getMonth(), dateObj.getDate() + 1),
      }
    }

    if (startDate || endDate) {
      where.date = where.date || {}
      if (startDate) {
        where.date.gte = new Date(startDate as string)
      }
      if (endDate) {
        where.date.lt = new Date(new Date(endDate as string).getTime() + 86400000)
      }
    }

    const workRecords = await prisma.workRecord.findMany({
      where,
      include: {
        staff: {
          select: {
            id: true,
            fullName: true,
            designation: true,
          },
        },
        entries: true,
      },
      orderBy: { date: 'desc' },
    })

    return res.status(200).json({
      data: workRecords,
      message: 'Work records retrieved',
    })
  } catch (error: any) {
    console.error('Error fetching work records:', error)
    return res.status(500).json({ message: 'Failed to fetch work records' })
  }
}

async function handleCreateWorkRecord(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { staffId, date, category, entries, remarks } = req.body

    if (!isValidId(staffId)) {
      return res.status(400).json({ message: 'Valid staffId is required' })
    }
    if (!safeDate(date)) {
      return res.status(400).json({ message: 'Valid date is required' })
    }
    if (!isValidString(category, 1, 100)) {
      return res.status(400).json({ message: 'Category is required (max 100 chars)' })
    }
    if (!Array.isArray(entries) || entries.length === 0 || entries.length > 50) {
      return res.status(400).json({ message: 'Entries must be an array (1-50 items)' })
    }
    if (remarks && !isValidString(remarks, 0, 1000)) {
      return res.status(400).json({ message: 'Remarks must be max 1000 chars' })
    }
    // Validate each entry
    for (const entry of entries) {
      if (entry.taskDescription && !isValidString(entry.taskDescription, 0, 500)) {
        return res.status(400).json({ message: 'Task description must be max 500 chars' })
      }
      if (entry.amHours !== undefined && (typeof entry.amHours !== 'number' || entry.amHours < 0 || entry.amHours > 24)) {
        return res.status(400).json({ message: 'AM hours must be 0-24' })
      }
      if (entry.pmHours !== undefined && (typeof entry.pmHours !== 'number' || entry.pmHours < 0 || entry.pmHours > 24)) {
        return res.status(400).json({ message: 'PM hours must be 0-24' })
      }
    }

    const recordDate = new Date(date)
    recordDate.setHours(0, 0, 0, 0)

    // Calculate totals
    let totalAM = 0
    let totalPM = 0
    let totalWholeDayHours = 0

    entries.forEach((entry: any) => {
      totalAM += entry.amHours || 0
      totalPM += entry.pmHours || 0
      totalWholeDayHours += entry.wholeDayHours || 0
    })

    const workRecord = await prisma.workRecord.create({
      data: {
        staffId,
        date: recordDate,
        category: sanitizeString(category),
        totalAM,
        totalPM,
        wholeDayHours: totalWholeDayHours,
        remarks: remarks ? sanitizeString(remarks) : null,
        entries: {
          create: entries.map((entry: any) => ({
            taskDescription: entry.taskDescription ? sanitizeString(entry.taskDescription) : '',
            amHours: entry.amHours || 0,
            pmHours: entry.pmHours || 0,
            wholeDayHours: entry.wholeDayHours || 0,
            remarks: entry.remarks ? sanitizeString(entry.remarks) : null,
          })),
        },
      },
      include: {
        staff: {
          select: {
            id: true,
            fullName: true,
            designation: true,
          },
        },
        entries: true,
      },
    })

    return res.status(201).json({
      message: 'Work record created',
      data: workRecord,
    })
  } catch (error: any) {
    console.error('Error creating work record:', error)
    return res.status(500).json({ message: 'Failed to create work record' })
  }
}
