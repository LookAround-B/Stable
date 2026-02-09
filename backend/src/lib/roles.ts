// Role-based authorization middleware
import { NextApiRequest, NextApiResponse } from 'next'
import { verifyToken, JwtPayload } from './auth'

// Role hierarchy - higher index means higher privilege
const ROLE_HIERARCHY: Record<string, number> = {
  'Groomer': 0,
  'Zamindar': 1,
  'Instructor': 1,
  'Health Advisor': 1,
  'Admin': 2,
  'Super Admin': 3,
}

// Define what roles can access what endpoints
const ROLE_PERMISSIONS: Record<string, string[]> = {
  // Horses - all can view, but higher roles can create/edit
  'GET /api/horses': ['Groomer', 'Zamindar', 'Instructor', 'Health Advisor', 'Admin', 'Super Admin'],
  'POST /api/horses': ['Zamindar', 'Admin', 'Super Admin'],
  'PUT /api/horses': ['Zamindar', 'Admin', 'Super Admin'],
  'DELETE /api/horses': ['Admin', 'Super Admin'],

  // Tasks
  'GET /api/tasks': ['Groomer', 'Zamindar', 'Instructor', 'Health Advisor', 'Admin', 'Super Admin'],
  'POST /api/tasks': ['Zamindar', 'Instructor', 'Admin', 'Super Admin'],
  'PUT /api/tasks': ['Zamindar', 'Instructor', 'Admin', 'Super Admin'],

  // Approvals - only Zamindar and Admin
  'GET /api/approvals': ['Zamindar', 'Admin', 'Super Admin'],
  'POST /api/approvals': ['Zamindar', 'Admin', 'Super Admin'],
  'PUT /api/approvals': ['Zamindar', 'Admin', 'Super Admin'],

  // Health Records - Health Advisor, Admin
  'GET /api/health-records': ['Health Advisor', 'Admin', 'Super Admin'],
  'POST /api/health-records': ['Health Advisor', 'Admin', 'Super Admin'],
  'PUT /api/health-records': ['Health Advisor', 'Admin', 'Super Admin'],

  // Reports - Admin only
  'GET /api/reports': ['Admin', 'Super Admin'],
  'POST /api/reports': ['Admin', 'Super Admin'],
  'PUT /api/reports': ['Admin', 'Super Admin'],

  // Employees - Admin only
  'GET /api/employees': ['Admin', 'Super Admin'],
  'POST /api/employees': ['Admin', 'Super Admin'],

  // Settings - Super Admin only
  'GET /api/settings': ['Super Admin'],
  'PUT /api/settings': ['Super Admin'],

  // Audit Logs - Admin and Super Admin
  'GET /api/audit-logs': ['Admin', 'Super Admin'],
}

export interface AuthenticatedRequest extends NextApiRequest {
  user?: JwtPayload
}

export function requireAuth(handler: (req: AuthenticatedRequest, res: NextApiResponse) => Promise<void>) {
  return async (req: AuthenticatedRequest, res: NextApiResponse) => {
    const authHeader = req.headers.authorization
    if (!authHeader) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    const token = authHeader.replace('Bearer ', '')
    const user = verifyToken(token)
    if (!user) {
      return res.status(401).json({ error: 'Invalid token' })
    }

    req.user = user
    return handler(req, res)
  }
}

export function requireRole(...allowedRoles: string[]) {
  return (handler: (req: AuthenticatedRequest, res: NextApiResponse) => Promise<void>) => {
    return async (req: AuthenticatedRequest, res: NextApiResponse) => {
      const authHeader = req.headers.authorization
      if (!authHeader) {
        return res.status(401).json({ error: 'Unauthorized' })
      }

      const token = authHeader.replace('Bearer ', '')
      const user = verifyToken(token)
      if (!user) {
        return res.status(401).json({ error: 'Invalid token' })
      }

      if (!allowedRoles.includes(user.designation)) {
        return res.status(403).json({ error: 'Forbidden: insufficient permissions' })
      }

      req.user = user
      return handler(req, res)
    }
  }
}

export function checkRolePermission(method: string, path: string, userRole: string): boolean {
  const key = `${method} ${path}`
  const allowedRoles = ROLE_PERMISSIONS[key]
  if (!allowedRoles) return true // If not in permissions list, allow access
  return allowedRoles.includes(userRole)
}

export function getRoleLevel(role: string): number {
  return ROLE_HIERARCHY[role] || -1
}
