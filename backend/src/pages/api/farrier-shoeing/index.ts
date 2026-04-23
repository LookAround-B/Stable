import { NextApiRequest, NextApiResponse } from 'next'
import {
  checkPermission,
  getTaskCapabilitiesForUser,
  getTokenFromRequest,
  verifyToken,
} from '@/lib/auth'
import prisma from '@/lib/prisma'
import { setCorsHeaders } from '@/lib/cors'
import {
  isValidId,
  isValidString,
  safeDate,
  sanitizeString,
} from '@/lib/validate'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const origin = req.headers.origin
  setCorsHeaders(res, origin as string | undefined)

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
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

    const user = await prisma.employee.findUnique({
      where: { id: decoded.id },
      select: { id: true, email: true, designation: true, fullName: true },
    })

    if (!user) {
      return res.status(401).json({ error: 'User not found' })
    }

    const canManageSchedules = await checkPermission(decoded, 'manageSchedules')
    const taskCapabilities = await getTaskCapabilitiesForUser(
      decoded.id,
      decoded.designation
    )
    const canViewFarrierShoeing =
      canManageSchedules ||
      taskCapabilities.canViewFarrierShoeing ||
      taskCapabilities.canRecordFarrierShoeing
    const canRecordFarrierShoeing =
      canManageSchedules || taskCapabilities.canRecordFarrierShoeing

    switch (req.method) {
      case 'GET':
        return handleGet(req, res, canViewFarrierShoeing)
      case 'POST':
        return handlePost(req, res, canRecordFarrierShoeing)
      case 'DELETE':
        return handleDelete(req, res, canRecordFarrierShoeing)
      default:
        res.setHeader('Allow', ['GET', 'POST', 'DELETE'])
        return res.status(405).json({ error: 'Method not allowed' })
    }
  } catch (error: any) {
    console.error('Farrier Shoeing API error:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}

async function handleGet(
  req: NextApiRequest,
  res: NextApiResponse,
  canViewFarrierShoeing: boolean
) {
  if (!canViewFarrierShoeing) {
    return res.status(403).json({
      error: 'Farrier shoeing access is not enabled for your account.',
    })
  }

  const { tab } = req.query

  const shoeingRecords = await prisma.farrierShoeing.findMany({
    include: {
      horse: {
        select: { id: true, name: true, stableNumber: true, status: true },
      },
      farrier: {
        select: { id: true, fullName: true, designation: true },
      },
    },
    orderBy: { shoeingDate: 'desc' },
  })

  if (tab === 'pending') {
    const allHorses = await prisma.horse.findMany({
      where: { status: 'Active' },
      select: { id: true, name: true, stableNumber: true, status: true },
      orderBy: { name: 'asc' },
    })

    const now = new Date()
    const latestShoeingMap: Record<string, any> = {}
    for (const record of shoeingRecords) {
      if (
        !latestShoeingMap[record.horseId] ||
        new Date(record.shoeingDate) >
          new Date(latestShoeingMap[record.horseId].shoeingDate)
      ) {
        latestShoeingMap[record.horseId] = record
      }
    }

    const pendingHorses = allHorses
      .map((horse) => {
        const latest = latestShoeingMap[horse.id]
        if (!latest) {
          return {
            horse,
            lastShoeingDate: null,
            nextDueDate: null,
            farrier: null,
            daysOverdue: null,
            neverShoed: true,
          }
        }

        const nextDue = new Date(latest.nextDueDate)
        if (nextDue <= now) {
          const daysOverdue = Math.floor(
            (now.getTime() - nextDue.getTime()) / (1000 * 60 * 60 * 24)
          )
          return {
            horse,
            lastShoeingDate: latest.shoeingDate,
            nextDueDate: latest.nextDueDate,
            farrier: latest.farrier,
            daysOverdue,
            neverShoed: false,
          }
        }

        return null
      })
      .filter(Boolean)

    return res.status(200).json({ data: pendingHorses })
  }

  return res.status(200).json({ data: shoeingRecords })
}

async function handlePost(
  req: NextApiRequest,
  res: NextApiResponse,
  canRecordFarrierShoeing: boolean
) {
  if (!canRecordFarrierShoeing) {
    return res.status(403).json({
      error: 'Farrier shoeing recording is not enabled for your account.',
    })
  }

  const { horseId, farrierId, shoeingDate, notes, numberOfLegs, shoeChanged } = req.body

  if (!isValidId(horseId)) {
    return res.status(400).json({ error: 'Valid horseId is required' })
  }
  if (!isValidId(farrierId)) {
    return res.status(400).json({ error: 'Valid farrierId is required' })
  }
  if (!safeDate(shoeingDate)) {
    return res.status(400).json({ error: 'Valid shoeingDate is required' })
  }
  if (notes && !isValidString(notes, 0, 1000)) {
    return res.status(400).json({ error: 'Notes must be max 1000 chars' })
  }

  let parsedShoeChanged = true
  if (shoeChanged !== undefined) {
    if (typeof shoeChanged === 'boolean') {
      parsedShoeChanged = shoeChanged
    } else if (shoeChanged === 'Yes') {
      parsedShoeChanged = true
    } else if (shoeChanged === 'No') {
      parsedShoeChanged = false
    } else {
      return res.status(400).json({ error: 'shoeChanged must be Yes or No' })
    }
  }

  const parsedLegCount =
    numberOfLegs === undefined || numberOfLegs === null || numberOfLegs === ''
      ? 4
      : parseInt(numberOfLegs, 10)

  if (
    Number.isNaN(parsedLegCount) ||
    parsedLegCount < 1 ||
    parsedLegCount > 4
  ) {
    return res
      .status(400)
      .json({ error: 'Number of legs must be between 1 and 4' })
  }

  const horse = await prisma.horse.findUnique({ where: { id: horseId } })
  if (!horse) {
    return res.status(404).json({ error: 'Horse not found' })
  }

  const farrier = await prisma.employee.findUnique({ where: { id: farrierId } })
  if (!farrier) {
    return res.status(404).json({ error: 'Farrier not found' })
  }

  const shoeingDateObj = new Date(shoeingDate)
  const nextDueDate = new Date(shoeingDateObj)
  nextDueDate.setDate(nextDueDate.getDate() + 21)

  const record = await prisma.farrierShoeing.create({
    data: {
      horseId,
      farrierId,
      shoeingDate: shoeingDateObj,
      nextDueDate,
      shoeChanged: parsedShoeChanged,
      numberOfLegs: parsedLegCount,
      notes: notes ? sanitizeString(notes) : null,
    },
    include: {
      horse: {
        select: { id: true, name: true, stableNumber: true, status: true },
      },
      farrier: {
        select: { id: true, fullName: true, designation: true },
      },
    },
  })

  return res.status(201).json({ message: 'Shoeing record created', data: record })
}

async function handleDelete(
  req: NextApiRequest,
  res: NextApiResponse,
  canRecordFarrierShoeing: boolean
) {
  if (!canRecordFarrierShoeing) {
    return res.status(403).json({
      error: 'Farrier shoeing deletion is not enabled for your account.',
    })
  }

  const { id } = req.body

  if (!isValidId(id)) {
    return res.status(400).json({ error: 'Valid id is required' })
  }

  const record = await prisma.farrierShoeing.findUnique({ where: { id } })
  if (!record) {
    return res.status(404).json({ error: 'Shoeing record not found' })
  }

  await prisma.farrierShoeing.delete({ where: { id } })

  return res.status(200).json({ message: 'Shoeing record deleted' })
}
