import type { NextApiRequest, NextApiResponse } from 'next'
import { rememberJson } from '@/lib/cache'
import { getTokenFromRequest, verifyToken } from '@/lib/auth'
import { cacheKeys, CACHE_TTL_SECONDS } from '@/lib/cacheKeys'
import prisma from '@/lib/prisma'
import { setCorsHeaders } from '@/lib/cors'
import { taskListSelect } from '@/lib/taskPayload'
import { safePositiveInt } from '@/lib/validate'
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const origin = req.headers.origin
  setCorsHeaders(res, origin as string | undefined)

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
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

    const userId = decoded.id
    const { status, skip = 0, take = 1000 } = req.query
    const statusValue = Array.isArray(status) ? status[0] : status
    const skipValue = safePositiveInt(skip, 0)
    const takeValue = safePositiveInt(take, 1000, 1000)

    const where: any = {
      assignedEmployeeId: userId, // Get tasks assigned to the current user
    }

    if (statusValue) {
      where.status = statusValue
    }

    const payload = await rememberJson(
      cacheKeys.myTasksList(userId, {
        status: statusValue ?? null,
        skip: skipValue,
        take: takeValue,
      }),
      CACHE_TTL_SECONDS.myTasksList,
      async () => {
        const [tasks, total] = await Promise.all([
          prisma.task.findMany({
            where,
            skip: skipValue,
            take: takeValue,
            select: taskListSelect,
            orderBy: { scheduledTime: 'desc' },
          }),
          prisma.task.count({ where }),
        ])

        return {
          success: true,
          data: tasks,
          pagination: { total, skip: skipValue, take: takeValue },
        }
      }
    )

    return res.status(200).json(payload)
  } catch (error) {
    console.error('Error fetching my tasks:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
