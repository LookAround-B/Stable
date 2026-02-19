import type { NextApiRequest, NextApiResponse } from 'next'
import { getTokenFromRequest, verifyToken } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { runMiddleware } from '@/lib/cors'
import cors from 'cors'

const corsMiddleware = cors({
  origin: ['http://localhost:3001', 'http://localhost:3002', 'http://localhost:3000'],
  credentials: true,
})

async function handleGetRoundCheck(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { date } = req.query
    const token = getTokenFromRequest(req as any)
    if (!token) {
      return res.status(401).json({ error: 'Unauthorized' })
    }
    const decoded = verifyToken(token)
    const userId = decoded?.id
    const userDesignation = decoded?.designation

    if (!userId || !userDesignation) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    console.log('Round check request - User designation:', userDesignation)

    // For Jamedar: get their own round check for the date
    if (userDesignation === 'Jamedar') {
      const checkDate = new Date(date as string)
      checkDate.setHours(0, 0, 0, 0)

      const roundCheck = await prisma.jamedarRoundCheck.findUnique({
        where: {
          jamedarId_checkDate: {
            jamedarId: userId,
            checkDate,
          },
        },
      })

      return res.status(200).json({ roundCheck: roundCheck || null })
    }

    // For managers/admins: get all Jamedars' round checks for the date
    const managerRoles = ['Stable Manager', 'School Administrator', 'Director', 'Executive Admin']
    if (managerRoles.includes(userDesignation)) {
      const checkDate = new Date(date as string)
      checkDate.setHours(0, 0, 0, 0)

      const roundChecks = await prisma.jamedarRoundCheck.findMany({
        where: { checkDate },
        include: {
          jamedar: {
            select: { id: true, fullName: true, designation: true, email: true },
          },
        },
        orderBy: { jamedar: { fullName: 'asc' } },
      })

      // Also get all Jamedars who don't have a record for this date
      const allJamedars = await prisma.employee.findMany({
        where: { designation: 'Jamedar' },
        select: { id: true, fullName: true, email: true },
        orderBy: { fullName: 'asc' },
      })

      const recordedJamedarIds = new Set(roundChecks.map(rc => rc.jamedarId))
      const missingJamedars = allJamedars.filter(j => !recordedJamedarIds.has(j.id))

      return res.status(200).json({ roundChecks, missingJamedars })
    }

    console.log('Unauthorized access attempt with designation:', userDesignation)
    return res.status(403).json({ error: 'Unauthorized - insufficient privileges' })
  } catch (error) {
    console.error('❌ Error fetching round checks:', error)
    res.status(500).json({ error: 'Failed to fetch round checks' })
  }
}

async function handleUpsertRoundCheck(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { date, morningCompleted, afternoonCompleted, eveningCompleted } = req.body
    const token = getTokenFromRequest(req as any)
    if (!token) {
      return res.status(401).json({ error: 'Unauthorized' })
    }
    const decoded = verifyToken(token)
    const jamedarId = decoded?.id
    const userDesignation = decoded?.designation

    if (!jamedarId || userDesignation !== 'Jamedar') {
      return res.status(403).json({ error: 'Only Jamedars can update their round checks' })
    }

    if (!date) {
      return res.status(400).json({ error: 'Date is required' })
    }

    const checkDate = new Date(date)
    checkDate.setHours(0, 0, 0, 0)

    // Check if any round was selected
    if (!morningCompleted && !afternoonCompleted && !eveningCompleted) {
      return res.status(400).json({ error: 'At least one round must be marked as completed' })
    }

    const roundCheck = await prisma.jamedarRoundCheck.upsert({
      where: {
        jamedarId_checkDate: {
          jamedarId,
          checkDate,
        },
      },
      update: {
        morningCompleted: morningCompleted || false,
        afternoonCompleted: afternoonCompleted || false,
        eveningCompleted: eveningCompleted || false,
        updatedAt: new Date(),
      },
      create: {
        jamedarId,
        checkDate,
        morningCompleted: morningCompleted || false,
        afternoonCompleted: afternoonCompleted || false,
        eveningCompleted: eveningCompleted || false,
      },
      include: {
        jamedar: {
          select: { id: true, fullName: true, designation: true, email: true },
        },
      },
    })

    console.log('✅ Round check updated:', roundCheck.id)
    res.status(200).json({ roundCheck })
  } catch (error) {
    console.error('❌ Error updating round check:', error)
    res.status(500).json({ error: 'Failed to update round check' })
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Run CORS middleware
  await runMiddleware(req, res, corsMiddleware)

  // Check authentication
  const token = getTokenFromRequest(req as any)
  if (!token || !verifyToken(token)) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  switch (req.method) {
    case 'GET':
      return handleGetRoundCheck(req, res)
    case 'POST':
    case 'PUT':
      return handleUpsertRoundCheck(req, res)
    default:
      return res.status(405).json({ error: 'Method not allowed' })
  }
}
