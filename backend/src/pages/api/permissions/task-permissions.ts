// pages/api/permissions/task-permissions.ts
// GET  - Fetch task-level permission overrides for an employee
// PUT  - Save task-level permission overrides for an employee
import type { NextApiRequest, NextApiResponse } from 'next'
import { getTokenFromRequest, verifyToken } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { setCorsHeaders } from '@/lib/cors'
import { isValidId } from '@/lib/validate'

const ADMIN_ROLES = ['Super Admin', 'Director', 'School Administrator']

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // CORS
  const origin = req.headers.origin
  setCorsHeaders(res, origin as string | undefined)

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  // Auth
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
      return handleGet(req, res)
    case 'PUT':
      return handlePut(req, res)
    default:
      return res.status(405).json({ error: 'Method not allowed' })
  }
}

// GET /api/permissions/task-permissions?employeeId=xxx
// Returns the employee's role defaults + their overrides
async function handleGet(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { employeeId } = req.query

    if (!employeeId || typeof employeeId !== 'string' || !isValidId(employeeId)) {
      return res.status(400).json({ error: 'Valid employeeId query parameter is required' })
    }

    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
      select: {
        id: true,
        fullName: true,
        designation: true,
        department: true,
        taskPermissions: {
          select: {
            permission: true,
            granted: true,
          },
        },
      },
    })

    if (!employee) {
      return res.status(404).json({ error: 'Employee not found' })
    }

    // Convert overrides array to a map { permissionKey: boolean }
    const overrides: Record<string, boolean> = {}
    for (const tp of employee.taskPermissions) {
      overrides[tp.permission] = tp.granted
    }

    return res.status(200).json({
      success: true,
      data: {
        id: employee.id,
        fullName: employee.fullName,
        designation: employee.designation,
        department: employee.department,
        overrides,
      },
    })
  } catch (error) {
    console.error('Error fetching task permissions:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}

// PUT /api/permissions/task-permissions
// Body: { employeeId: string, overrides: { [permission]: boolean | null } }
// null = remove override (revert to role default)
async function handlePut(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { employeeId, overrides } = req.body

    if (!employeeId || typeof employeeId !== 'string' || !isValidId(employeeId)) {
      return res.status(400).json({ error: 'Valid employeeId is required' })
    }

    if (!overrides || typeof overrides !== 'object' || Array.isArray(overrides)) {
      return res.status(400).json({ error: 'overrides object is required' })
    }

    const entries = Object.entries(overrides)
    if (entries.length > 200) {
      return res.status(400).json({ error: 'Too many overrides (max 200)' })
    }
    for (const [key] of entries) {
      if (typeof key !== 'string' || key.length > 100 || !/^[a-zA-Z0-9_.:-]+$/.test(key)) {
        return res.status(400).json({ error: `Invalid permission key: ${key.slice(0, 50)}` })
      }
    }

    // Verify employee exists
    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
      select: { id: true },
    })

    if (!employee) {
      return res.status(404).json({ error: 'Employee not found' })
    }

    const upserts: Promise<any>[] = []
    const deletes: Promise<any>[] = []

    for (const [permission, value] of Object.entries(overrides)) {
      if (value === null) {
        // Remove override → revert to role default
        deletes.push(
          prisma.employeeTaskPermission.deleteMany({
            where: { employeeId, permission },
          })
        )
      } else {
        // Set override
        upserts.push(
          prisma.employeeTaskPermission.upsert({
            where: {
              employeeId_permission: { employeeId, permission },
            },
            create: {
              employeeId,
              permission,
              granted: Boolean(value),
            },
            update: {
              granted: Boolean(value),
            },
          })
        )
      }
    }

    await Promise.all([...upserts, ...deletes])

    return res.status(200).json({ success: true })
  } catch (error) {
    console.error('Error updating task permissions:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
