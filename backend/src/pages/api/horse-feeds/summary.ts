import type { NextApiRequest, NextApiResponse } from 'next'
import prisma from '@/lib/prisma'
import {
  checkPermission,
  getTaskCapabilitiesForUser,
  getTokenFromRequest,
  verifyToken,
} from '@/lib/auth'
import { setCorsHeaders } from '@/lib/cors'
import { ensureExpiredHorseFeedMenuNotifications } from '@/lib/horseFeeds'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const origin = req.headers.origin
  setCorsHeaders(res, origin as string | undefined)

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const token = getTokenFromRequest(req as any)
    if (!token) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    const decoded = verifyToken(token)
    if (!decoded) {
      return res.status(401).json({ error: 'Invalid token' })
    }

    const canManageInventory = await checkPermission(decoded, 'manageInventory')
    const taskCapabilities = await getTaskCapabilitiesForUser(
      decoded.id,
      decoded.designation
    )

    if (
      !canManageInventory &&
      !taskCapabilities.canViewHorseFeeds &&
      !taskCapabilities.canRecordHorseFeeds
    ) {
      return res.status(403).json({ error: 'Forbidden' })
    }

    const { fromDate, toDate } = req.query

    await ensureExpiredHorseFeedMenuNotifications()

    if (!fromDate || !toDate) {
      return res
        .status(400)
        .json({ error: 'Missing required parameters: fromDate and toDate' })
    }

    const [fromYear, fromMonth, fromDay] = (fromDate as string)
      .split('-')
      .map(Number)
    const [toYear, toMonth, toDay] = (toDate as string).split('-').map(Number)

    const startDate = new Date(
      Date.UTC(fromYear, fromMonth - 1, fromDay, 0, 0, 0)
    )
    const endDate = new Date(Date.UTC(toYear, toMonth - 1, toDay + 1, 0, 0, 0))

    const records = await prisma.horseFeed.findMany({
      where: {
        date: {
          gte: startDate,
          lt: endDate,
        },
      },
      include: {
        horse: {
          select: {
            id: true,
            name: true,
            stableNumber: true,
          },
        },
      },
      orderBy: { date: 'desc' },
    })

    const summary: Record<string, any> = {}

    for (const record of records) {
      const horseId = record.horse.id
      const horseName = record.horse.name
      const stableNumber = record.horse.stableNumber

      if (!summary[horseId]) {
        summary[horseId] = {
          horseName,
          stableNumber,
          sports: 0,
          balance: 0,
          growth: 0,
          barley: 0,
          oats: 0,
          soya: 0,
          lucerne: 0,
          linseed: 0,
          bran: 0,
          salt: 0,
          dcp: 0,
          epsom: 0,
          riceBranOil: 0,
          heylage: 0,
          electrolyte: 0,
          diggyMax: 0,
          temporaryMenuName: null,
          menuStartAt: null,
          menuEndAt: null,
        }
      }

      summary[horseId].sports += record.sports || 0
      summary[horseId].balance += record.balance || 0
      summary[horseId].growth += record.growth || 0
      summary[horseId].barley += record.barley || 0
      summary[horseId].oats += record.oats || 0
      summary[horseId].soya += record.soya || 0
      summary[horseId].lucerne += record.lucerne || 0
      summary[horseId].linseed += record.linseed || 0
      summary[horseId].bran += record.bran || 0
      summary[horseId].salt += record.salt || 0
      summary[horseId].dcp += record.dcp || 0
      summary[horseId].epsom += record.epsom || 0
      summary[horseId].riceBranOil += record.riceBranOil || 0
      summary[horseId].heylage += record.heylage || 0
      summary[horseId].electrolyte += record.electrolyte || 0
      summary[horseId].diggyMax += record.diggyMax || 0


      if (
        record.temporaryMenuName &&
        (!summary[horseId].menuEndAt ||
          new Date(record.menuEndAt || record.date) >
            new Date(summary[horseId].menuEndAt || 0))
      ) {
        summary[horseId].temporaryMenuName = record.temporaryMenuName
        summary[horseId].menuStartAt = record.menuStartAt
        summary[horseId].menuEndAt = record.menuEndAt
      }
    }

    return res.status(200).json({
      success: true,
      data: summary,
    })
  } catch (error: any) {
    console.error('Error fetching summary:', error)
    return res.status(500).json({ error: 'Failed to fetch summary' })
  }
}
