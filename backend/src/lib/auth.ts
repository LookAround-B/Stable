// JWT and Authentication utilities
import jwt from 'jsonwebtoken'
import { NextRequest, NextResponse } from 'next/server'
import type { NextApiRequest } from 'next'

const JWT_SECRET: string = process.env.JWT_SECRET || 'your-secret-key'
const JWT_EXPIRE: string = process.env.JWT_EXPIRE || '7d'

export interface JwtPayload {
  id: string
  email: string
  designation: string
}

export const generateToken = (payload: JwtPayload): string => {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRE } as any)
}

export const verifyToken = (token: string): JwtPayload | null => {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload
    return decoded
  } catch (error) {
    return null
  }
}

export const getTokenFromRequest = (request: NextApiRequest | NextRequest): string | null => {
  // Handle NextApiRequest (used in pages/api routes)
  if ('headers' in request && typeof request.headers === 'object' && !('get' in request.headers)) {
    const headers = request.headers as Record<string, string | string[]>
    const authHeader = headers['authorization'] as string | undefined
    if (!authHeader) return null
    
    const parts = authHeader.split(' ')
    if (parts.length !== 2 || parts[0] !== 'Bearer') return null
    
    return parts[1]
  }
  
  // Handle NextRequest (used in middleware)
  if ('headers' in request && typeof request.headers.get === 'function') {
    const authHeader = request.headers.get('authorization')
    if (!authHeader) return null
    
    const parts = authHeader.split(' ')
    if (parts.length !== 2 || parts[0] !== 'Bearer') return null
    
    return parts[1]
  }
  
  return null
}

export const createErrorResponse = (message: string, status: number) => {
  return NextResponse.json({ error: message }, { status })
}

export const createSuccessResponse = (data: any, status: number = 200) => {
  return NextResponse.json(data, { status })
}

// ── Permission helpers ──────────────────────────────────────

import prisma from '@/lib/prisma'
import { hasPermission as roleHasPermission } from '@/lib/roles-prd'

const ADMIN_DESIGNATIONS = ['Super Admin', 'Director', 'School Administrator']

export type PermissionKey =
  | 'viewDashboard'
  | 'manageEmployees'
  | 'viewReports'
  | 'issueFines'
  | 'manageInventory'
  | 'manageSchedules'
  | 'viewPayroll'

/**
 * Check whether a user (from JWT) has a specific permission.
 * Admins always pass. For others, look up the EmployeePermission row.
 * If no row exists the user falls back to *denied*.
 */
export const checkPermission = async (
  decoded: JwtPayload,
  permission: PermissionKey
): Promise<boolean> => {
  // Admins bypass permission checks
  if (ADMIN_DESIGNATIONS.includes(decoded.designation)) return true

  const row = await prisma.employeePermission.findUnique({
    where: { employeeId: decoded.id },
    select: { [permission]: true },
  })

  return !!(row as any)?.[permission]
}

/**
 * Check whether a user has a specific task-level permission.
 * Resolution order:
 *   1. Per-employee override in EmployeeTaskPermission → use it
 *   2. No override → fall back to role default from ROLE_PERMISSIONS
 * Admins always pass.
 */
export const checkTaskPermission = async (
  decoded: JwtPayload,
  permission: string
): Promise<boolean> => {
  // Admins bypass
  if (ADMIN_DESIGNATIONS.includes(decoded.designation)) return true

  // 1. Check for per-employee override
  const override = await prisma.employeeTaskPermission.findUnique({
    where: {
      employeeId_permission: {
        employeeId: decoded.id,
        permission,
      },
    },
    select: { granted: true },
  })

  if (override !== null) {
    return override.granted
  }

  // 2. Fall back to role default
  return roleHasPermission(decoded.designation, permission)
}
