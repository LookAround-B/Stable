// pages/api/permissions/index.ts
// GET  - Fetch all employees with their permissions (grouped by designation)
// PUT  - Bulk update permissions for selected employees
import type { NextApiRequest, NextApiResponse } from 'next'
import { getTokenFromRequest, verifyToken } from '@/lib/auth'
import { rememberJson } from '@/lib/cache'
import {
  cacheKeys,
  CACHE_TTL_SECONDS,
  invalidateEmployeeCaches,
  invalidatePermissionCaches,
} from '@/lib/cacheKeys'
import prisma from '@/lib/prisma'
import { setCorsHeaders } from '@/lib/cors'
import { isValidId } from '@/lib/validate'

const ADMIN_ROLES = ['Super Admin', 'Director', 'School Administrator']

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
    return res.status(401).json({ error: 'No authorization header' })
  }

  const decoded = verifyToken(token)
  if (!decoded) {
    return res.status(401).json({ error: 'Invalid or expired token' })
  }

  if (!ADMIN_ROLES.includes(decoded.designation)) {
    return res.status(403).json({ error: 'Forbidden: admin access required' })
  }

  switch (req.method) {
    case 'GET':
      return handleGet(res)
    case 'PUT':
      return handlePut(req, res)
    default:
      return res.status(405).json({ error: 'Method not allowed' })
  }
}

async function handleGet(res: NextApiResponse) {
  try {
    const employees = await rememberJson(
      cacheKeys.permissionsMatrix(),
      CACHE_TTL_SECONDS.permissionsMatrix,
      async () =>
        prisma.employee.findMany({
          where: { employmentStatus: 'Active' },
          select: {
            id: true,
            fullName: true,
            email: true,
            designation: true,
            department: true,
            profileImage: true,
            permissions: {
              select: {
                manageEmployees: true,
                viewReports: true,
                issueFines: true,
                manageInventory: true,
                manageSchedules: true,
                viewPayroll: true,
              },
            },
          },
          orderBy: [{ designation: 'asc' }, { fullName: 'asc' }],
        })
    )

    return res.status(200).json({ success: true, data: employees })
  } catch (error) {
    console.error('Error fetching permissions:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}

async function handlePut(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { employeeIds, permissions } = req.body

    if (!Array.isArray(employeeIds) || employeeIds.length === 0 || employeeIds.length > 500) {
      return res
        .status(400)
        .json({ error: 'employeeIds must be a non-empty array (max 500)' })
    }

    if (!employeeIds.every((id: unknown) => isValidId(id))) {
      return res
        .status(400)
        .json({ error: 'All employeeIds must be valid IDs' })
    }

    if (!permissions || typeof permissions !== 'object') {
      return res.status(400).json({ error: 'permissions object is required' })
    }

    const allowedKeys = [
      'manageEmployees',
      'viewReports',
      'issueFines',
      'manageInventory',
      'manageSchedules',
      'viewPayroll',
    ]

    const permData: Record<string, boolean> = {}
    for (const key of allowedKeys) {
      if (key in permissions) {
        permData[key] = Boolean(permissions[key])
      }
    }

    const results = await Promise.all(
      employeeIds.map((employeeId: string) =>
        prisma.employeePermission.upsert({
          where: { employeeId },
          create: { employeeId, ...permData },
          update: permData,
        })
      )
    )

    await Promise.all([
      invalidateEmployeeCaches(),
      invalidatePermissionCaches(),
      ...employeeIds.map((employeeId: string) => invalidatePermissionCaches(employeeId)),
    ])

    return res.status(200).json({ success: true, updated: results.length })
  } catch (error) {
    console.error('Error updating permissions:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
