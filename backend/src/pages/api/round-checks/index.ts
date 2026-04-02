import type { NextApiRequest, NextApiResponse } from 'next'
import {
  checkPermission,
  getTaskCapabilitiesForUser,
  getTokenFromRequest,
  verifyToken,
} from '@/lib/auth'
import prisma from '@/lib/prisma'
import { setCorsHeaders } from '@/lib/cors'
import { safeDate } from '@/lib/validate'

async function handleGetRoundCheck(
  req: NextApiRequest,
  res: NextApiResponse,
  decoded: { id: string; designation: string; email: string }
) {
  try {
    const { date } = req.query

    if (!date || !safeDate(date as string)) {
      return res.status(400).json({ error: 'Valid date is required' })
    }

    const canManageSchedules = await checkPermission(decoded, 'manageSchedules')
    const taskCapabilities = await getTaskCapabilitiesForUser(
      decoded.id,
      decoded.designation
    )
    const canViewTeam =
      canManageSchedules || taskCapabilities.canViewTeamRoundChecks
    const canUpdateOwn = taskCapabilities.canUpdateOwnRoundChecks

    if (!canViewTeam && !canUpdateOwn) {
      return res.status(403).json({
        error: 'Round check access is not enabled for your account.',
      })
    }

    const checkDate = new Date(date as string)
    checkDate.setHours(0, 0, 0, 0)

    if (!canViewTeam) {
      const roundCheck = await prisma.jamedarRoundCheck.findUnique({
        where: {
          jamedarId_checkDate: {
            jamedarId: decoded.id,
            checkDate,
          },
        },
      })

      return res.status(200).json({ roundCheck: roundCheck || null })
    }

    const roundChecks = await prisma.jamedarRoundCheck.findMany({
      where: { checkDate },
      include: {
        jamedar: {
          select: { id: true, fullName: true, designation: true, email: true },
        },
      },
      orderBy: { jamedar: { fullName: 'asc' } },
    })

    const allJamedars = await prisma.employee.findMany({
      where: { designation: 'Jamedar' },
      select: { id: true, fullName: true, email: true },
      orderBy: { fullName: 'asc' },
    })

    const recordedJamedarIds = new Set(roundChecks.map((rc) => rc.jamedarId))
    const missingJamedars = allJamedars.filter((j) => !recordedJamedarIds.has(j.id))

    return res.status(200).json({ roundChecks, missingJamedars })
  } catch (error) {
    console.error('Error fetching round checks:', error)
    res.status(500).json({ error: 'Failed to fetch round checks' })
  }
}

async function handleUpsertRoundCheck(
  req: NextApiRequest,
  res: NextApiResponse,
  decoded: { id: string; designation: string; email: string }
) {
  try {
    const { date, morningCompleted, afternoonCompleted, eveningCompleted } = req.body

    const taskCapabilities = await getTaskCapabilitiesForUser(
      decoded.id,
      decoded.designation
    )

    if (!taskCapabilities.canUpdateOwnRoundChecks) {
      return res.status(403).json({
        error: 'Round check updates are not enabled for your account.',
      })
    }

    if (!date || !safeDate(date as string)) {
      return res.status(400).json({ error: 'Valid date is required' })
    }

    const checkDate = new Date(date)
    checkDate.setHours(0, 0, 0, 0)

    if (
      morningCompleted !== true &&
      afternoonCompleted !== true &&
      eveningCompleted !== true
    ) {
      return res.status(400).json({
        error: 'At least one round must be marked as completed',
      })
    }

    const roundCheck = await prisma.jamedarRoundCheck.upsert({
      where: {
        jamedarId_checkDate: {
          jamedarId: decoded.id,
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
        jamedarId: decoded.id,
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

    res.status(200).json({ roundCheck })
  } catch (error) {
    console.error('Error updating round check:', error)
    res.status(500).json({ error: 'Failed to update round check' })
  }
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const origin = req.headers.origin
  setCorsHeaders(res, origin as string | undefined)

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  const token = getTokenFromRequest(req as any)
  if (!token) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const decoded = verifyToken(token)
  if (!decoded) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  switch (req.method) {
    case 'GET':
      return handleGetRoundCheck(req, res, decoded)
    case 'POST':
    case 'PUT':
      return handleUpsertRoundCheck(req, res, decoded)
    default:
      return res.status(405).json({ error: 'Method not allowed' })
  }
}
