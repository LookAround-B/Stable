// JWT and Authentication utilities
import jwt from 'jsonwebtoken'
import { NextRequest, NextResponse } from 'next/server'
import type { NextApiRequest } from 'next'

const JWT_SECRET: string = (() => {
  const secret = process.env.JWT_SECRET
  if (!secret || secret === 'your-secret-key') {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('FATAL: JWT_SECRET environment variable must be set in production')
    }
    console.warn('[AUTH] WARNING: Using default JWT_SECRET. Set JWT_SECRET env var for production.')
    return 'dev-only-insecure-secret'
  }
  return secret
})()
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
import { getRolePermissions } from '@/lib/roles-prd'

const ADMIN_DESIGNATIONS = ['Super Admin', 'Director', 'School Administrator']

const TASK_CAPABILITY_RULES = {
  canViewTasks: [
    'assign_daily_tasks',
    'assign_tasks',
    'approve_reject_tasks',
    'approve_groom_logs',
    'approve_instructor_updates',
    'view_assigned_tasks',
    'view_assigned_horses',
    'mark_task_completion',
    'submit_task_completion',
    'submit_task_updates',
    'submit_task_update',
    'submit_horse_care_logs',
    'log_work_performed',
    'mark_issue_status',
  ],
  canCreateTasks: ['assign_daily_tasks', 'assign_tasks'],
  canReviewTasks: [
    'approve_reject_tasks',
    'approve_groom_logs',
    'approve_instructor_updates',
  ],
  canWorkOnAssignedTasks: [
    'view_assigned_tasks',
    'view_assigned_horses',
    'mark_task_completion',
    'submit_task_completion',
    'submit_task_updates',
    'submit_task_update',
    'submit_horse_care_logs',
    'log_work_performed',
    'mark_issue_status',
  ],
  canManageHorseTeams: ['assign_horses_to_staff'],
  canViewInspections: [
    'submit_inspection_rounds',
    'view_inspection_rounds',
    'resolve_inspection_rounds',
  ],
  canViewAllInspections: [
    'view_inspection_rounds',
    'resolve_inspection_rounds',
  ],
  canCreateInspections: ['submit_inspection_rounds'],
  canResolveInspections: ['resolve_inspection_rounds'],
  canUpdateOwnRoundChecks: ['update_own_round_checks'],
  canViewTeamRoundChecks: ['view_team_round_checks'],
  canViewMedicineLogs: [
    'log_medicine_administration',
    'record_treatment_notes',
    'approve_medicine_entries',
    'view_medical_alerts',
  ],
  canViewHorseFeeds: ['add_feed_notes', 'view_feed_compliance'],
  canRecordHorseFeeds: ['add_feed_notes'],
  canRecordMedicineLogs: [
    'log_medicine_administration',
    'record_treatment_notes',
  ],
  canApproveMedicineLogs: ['approve_medicine_entries'],
  canViewPendingMedicineLogs: ['approve_medicine_entries'],
  canViewOwnMedicineLogs: [
    'log_medicine_administration',
    'record_treatment_notes',
  ],
  canViewFarrierShoeing: [
    'log_farrier_visits',
    'record_hoof_work',
    'schedule_next_visit',
  ],
  canRecordFarrierShoeing: [
    'log_farrier_visits',
    'record_hoof_work',
    'schedule_next_visit',
  ],
} as const

export type TaskCapabilityKey = keyof typeof TASK_CAPABILITY_RULES
export type TaskCapabilities = Record<TaskCapabilityKey, boolean>

export type PermissionKey =
  | 'manageEmployees'
  | 'viewReports'
  | 'issueFines'
  | 'manageInventory'
  | 'manageSchedules'
  | 'viewPayroll'

export const isAdminDesignation = (designation?: string | null): boolean =>
  ADMIN_DESIGNATIONS.includes(designation || '')

const buildEffectiveTaskPermissionMap = (
  designation: string,
  overrides: Array<{ permission: string; granted: boolean }>
): Record<string, boolean> => {
  const effectivePermissions: Record<string, boolean> = {}

  for (const permission of getRolePermissions(designation)) {
    effectivePermissions[permission] = true
  }

  for (const override of overrides) {
    effectivePermissions[override.permission] = override.granted
  }

  return effectivePermissions
}

const buildTaskCapabilities = (
  effectivePermissions: Record<string, boolean>,
  isAdmin: boolean
): TaskCapabilities => {
  const capabilities = {} as TaskCapabilities

  for (const capability of Object.keys(TASK_CAPABILITY_RULES) as TaskCapabilityKey[]) {
    capabilities[capability] =
      isAdmin ||
      TASK_CAPABILITY_RULES[capability].some(
        (permission) => effectivePermissions[permission] === true
      )
  }

  return capabilities
}

export const getEffectiveTaskPermissionsForUser = async (
  employeeId: string,
  designation: string
): Promise<Record<string, boolean>> => {
  if (!employeeId) return {}

  const overrides = await prisma.employeeTaskPermission.findMany({
    where: { employeeId },
    select: {
      permission: true,
      granted: true,
    },
  })

  return buildEffectiveTaskPermissionMap(designation, overrides)
}

export const getTaskCapabilitiesForUser = async (
  employeeId: string,
  designation: string
): Promise<TaskCapabilities> => {
  const isAdmin = isAdminDesignation(designation)
  const effectivePermissions = isAdmin
    ? {}
    : await getEffectiveTaskPermissionsForUser(employeeId, designation)

  return buildTaskCapabilities(effectivePermissions, isAdmin)
}

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
  if (isAdminDesignation(decoded.designation)) return true

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
  if (isAdminDesignation(decoded.designation)) return true

  const effectivePermissions = await getEffectiveTaskPermissionsForUser(
    decoded.id,
    decoded.designation
  )

  return effectivePermissions[permission] === true
}

export const checkTaskCapability = async (
  decoded: JwtPayload,
  capability: TaskCapabilityKey
): Promise<boolean> => {
  const capabilities = await getTaskCapabilitiesForUser(
    decoded.id,
    decoded.designation
  )

  return capabilities[capability] === true
}
