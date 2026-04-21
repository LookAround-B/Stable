import { NextApiRequest, NextApiResponse } from 'next'
import prisma from '@/lib/prisma'
import {
  checkPermission,
  getTaskCapabilitiesForUser,
  getTokenFromRequest,
  verifyToken,
} from '@/lib/auth'
import { setCorsHeaders } from '@/lib/cors'
import {
  isValidId,
  isValidString,
  safeDate,
  sanitizeString,
} from '@/lib/validate'
import { ensureExpiredHorseFeedMenuNotifications } from '@/lib/horseFeeds'

async function handler(req: NextApiRequest, res: NextApiResponse) {
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
      select: {
        id: true,
        email: true,
        designation: true,
        fullName: true,
      },
    })

    if (!user) {
      return res.status(401).json({ error: 'User not found' })
    }

    const canManageInventory = await checkPermission(decoded, 'manageInventory')
    const taskCapabilities = await getTaskCapabilitiesForUser(
      decoded.id,
      decoded.designation
    )
    const canViewHorseFeeds =
      canManageInventory ||
      taskCapabilities.canViewHorseFeeds ||
      taskCapabilities.canRecordHorseFeeds
    const canRecordHorseFeeds = taskCapabilities.canRecordHorseFeeds

    if (req.method === 'GET') {
      if (!canViewHorseFeeds) {
        return res.status(403).json({
          error: 'You do not have permission to view horse feeds',
        })
      }

      await ensureExpiredHorseFeedMenuNotifications()

      const { startDate, endDate, horseId } = req.query
      const where: any = {}

      if (horseId) {
        where.horseId = horseId as string
      }

      if (startDate || endDate) {
        where.date = {}
        if (startDate) {
          const [year, month, day] = (startDate as string).split('-').map(Number)
          where.date.gte = new Date(Date.UTC(year, month - 1, day, 0, 0, 0))
        }
        if (endDate) {
          const [year, month, day] = (endDate as string).split('-').map(Number)
          where.date.lt = new Date(Date.UTC(year, month - 1, day + 1, 0, 0, 0))
        }
      }

      const records = await prisma.horseFeed.findMany({
        where,
        include: {
          horse: {
            select: {
              id: true,
              name: true,
            },
          },
          recordedBy: {
            select: {
              id: true,
              fullName: true,
            },
          },
        },
        orderBy: { date: 'desc' },
      })

      return res.status(200).json({
        data: records,
        message: 'Horse feed records retrieved',
      })
    }

    if (req.method === 'POST') {
      if (!canRecordHorseFeeds) {
        return res.status(403).json({
          error: 'Horse feed recording is not enabled for your account',
        })
      }

      const {
        horseId,
        date,
        balance,
        barley,
        oats,
        soya,
        lucerne,
        linseed,
        rOil,
        biotin,
        joint,
        epsom,
        heylase,
        notes,
        temporaryMenuName,
        menuStartAt,
        menuEndAt,
      } = req.body

      if (!isValidId(horseId)) {
        return res.status(400).json({ error: 'Valid Horse ID is required' })
      }
      if (!safeDate(date)) {
        return res.status(400).json({ error: 'Valid date is required' })
      }
      if (notes && !isValidString(notes, 0, 1000)) {
        return res.status(400).json({ error: 'Notes must be max 1000 chars' })
      }

      const menuStartDate = menuStartAt ? safeDate(menuStartAt) : null
      const menuEndDate = menuEndAt ? safeDate(menuEndAt) : null
      const hasMenuOverrideFields = Boolean(
        temporaryMenuName || menuStartAt || menuEndAt
      )

      if (hasMenuOverrideFields) {
        if (!isValidString(temporaryMenuName, 1, 120)) {
          return res.status(400).json({
            error:
              'Temporary menu name is required when adding a menu change period',
          })
        }
        if (!menuStartDate || !menuEndDate) {
          return res.status(400).json({
            error: 'Valid menu start and end time are required',
          })
        }
        if (menuEndDate < menuStartDate) {
          return res.status(400).json({
            error: 'Menu end time must be after the start time',
          })
        }
      }

      const horse = await prisma.horse.findUnique({
        where: { id: horseId },
      })

      if (!horse) {
        return res.status(404).json({ error: 'Horse not found' })
      }

      const [year, month, day] = (date as string).split('-').map(Number)
      const recordDate = new Date(Date.UTC(year, month - 1, day, 0, 0, 0))

      const existingRecord = await prisma.horseFeed.findUnique({
        where: {
          horseId_date: {
            horseId,
            date: recordDate,
          },
        },
      })

      if (existingRecord) {
        return res.status(400).json({
          error: 'A feed record already exists for this horse on this date',
        })
      }

      const record = await prisma.horseFeed.create({
        data: {
          recordedById: user.id,
          horseId,
          date: recordDate,
          balance: balance ? parseFloat(balance) : null,
          barley: barley ? parseFloat(barley) : null,
          oats: oats ? parseFloat(oats) : null,
          soya: soya ? parseFloat(soya) : null,
          lucerne: lucerne ? parseFloat(lucerne) : null,
          linseed: linseed ? parseFloat(linseed) : null,
          rOil: rOil ? parseFloat(rOil) : null,
          biotin: biotin ? parseFloat(biotin) : null,
          joint: joint ? parseFloat(joint) : null,
          epsom: epsom ? parseFloat(epsom) : null,
          heylase: heylase ? parseFloat(heylase) : null,
          notes: notes ? sanitizeString(notes) : null,
          temporaryMenuName: temporaryMenuName
            ? sanitizeString(temporaryMenuName)
            : null,
          menuStartAt: menuStartDate,
          menuEndAt: menuEndDate,
        },
        include: {
          horse: {
            select: {
              id: true,
              name: true,
            },
          },
          recordedBy: {
            select: {
              id: true,
              fullName: true,
            },
          },
        },
      })

      return res.status(201).json({
        data: record,
        message: 'Horse feed record created successfully',
      })
    }

    res.setHeader('Allow', ['GET', 'POST'])
    return res.status(405).json({ error: 'Method not allowed' })
  } catch (error: any) {
    console.error('Horse feeds API error:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}

export default handler
