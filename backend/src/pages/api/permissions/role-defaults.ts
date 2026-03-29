// pages/api/permissions/role-defaults.ts
// GET - Returns the default permissions matrix from roles-prd.ts
// So the frontend can display role defaults alongside per-employee overrides
import type { NextApiRequest, NextApiResponse } from 'next'
import { getTokenFromRequest, verifyToken } from '@/lib/auth'
import { ROLE_PERMISSIONS, DEPARTMENT_ROLES } from '@/lib/roles-prd'
import { setCorsHeaders } from '@/lib/cors'

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

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  // Return the full permissions matrix and department groupings
  return res.status(200).json({
    success: true,
    data: {
      rolePermissions: ROLE_PERMISSIONS,
      departmentRoles: DEPARTMENT_ROLES,
    },
  })
}
