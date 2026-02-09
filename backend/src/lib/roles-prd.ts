// Role-based authorization based on Equestrian Facility Management PRD v2.0
import { NextApiRequest, NextApiResponse } from 'next'
import { verifyToken, JwtPayload } from './auth'

// Role hierarchy by department and level
const ROLE_HIERARCHY: Record<string, number> = {
  // Ground Operations
  'Guard': 1,
  'Gardener': 1,
  'Housekeeping': 1,
  'Electrician': 1,
  'Ground Supervisor': 2,
  
  // Stable Operations
  'Groom': 1,
  'Riding Boy': 1,
  'Rider': 1,
  'Farrier': 1,
  'Jamedar': 1,
  'Instructor': 2,
  'Stable Manager': 3,
  
  // Accounts & Administration
  'Executive Admin': 1,
  'Executive Accounts': 1,
  'Senior Executive Accounts': 2,
  
  // Leadership
  'School Administrator': 4,
  'Director': 5,
  'Super Admin': 5,
}

// Department mapping
const DEPARTMENT_ROLES: Record<string, string[]> = {
  'Ground Operations': [
    'Guard', 'Gardener', 'Housekeeping', 'Electrician', 'Ground Supervisor'
  ],
  'Stable Operations': [
    'Groom', 'Riding Boy', 'Rider', 'Farrier', 'Jamedar', 'Instructor', 'Stable Manager'
  ],
  'Accounts/Administration': [
    'Executive Admin', 'Executive Accounts', 'Senior Executive Accounts'
  ],
  'Leadership': [
    'School Administrator', 'Director', 'Super Admin'
  ],
}

// Role Permissions Matrix
const ROLE_PERMISSIONS: Record<string, string[]> = {
  // Ground Operations - Staff Level
  'Guard': [
    'log_gate_attendance',
    'log_visitor',
    'view_own_attendance',
    'submit_task_update'
  ],
  'Gardener': [
    'log_attendance',
    'view_assigned_tasks',
    'submit_task_completion',
    'upload_photos'
  ],
  'Housekeeping': [
    'log_attendance',
    'fill_cleaning_checklist',
    'upload_room_photos',
    'view_assigned_tasks'
  ],
  'Electrician': [
    'log_attendance_by_shift',
    'log_work_performed',
    'mark_issue_status',
    'upload_evidence'
  ],
  
  // Ground Supervisor - Managerial
  'Ground Supervisor': [
    'view_team_attendance',
    'assign_daily_tasks',
    'approve_reject_tasks',
    'view_activity_logs',
    'escalate_to_admin'
  ],
  
  // Stable Operations - Staff Level
  'Groom': [
    'view_assigned_horses',
    'mark_task_completion',
    'add_activity_notes',
    'submit_horse_care_logs'
  ],
  'Riding Boy': [
    'log_attendance',
    'log_horse_activity',
    'submit_task_updates',
    'view_assigned_horses'
  ],
  'Rider': [
    'log_attendance',
    'log_horse_activity',
    'complete_cleaning_checklist',
    'submit_task_updates',
    'upload_photos'
  ],
  'Farrier': [
    'log_farrier_visits',
    'record_hoof_work',
    'schedule_next_visit',
    'upload_before_after_photos'
  ],
  'Jamedar': [
    'log_medicine_administration',
    'record_treatment_notes',
    'flag_low_stock',
    'upload_treatment_photos'
  ],
  
  // Instructors - Supervisory
  'Instructor': [
    'update_training_logs',
    'add_feed_notes',
    'review_groom_activity',
    'suggest_medical_attention',
    'view_horse_care_logs'
  ],
  
  // Stable Manager - Approval Authority
  'Stable Manager': [
    'assign_horses_to_staff',
    'assign_tasks',
    'approve_groom_logs',
    'approve_medicine_entries',
    'approve_instructor_updates',
    'view_feed_compliance',
    'view_medical_alerts',
    'escalate_to_director'
  ],
  
  // Accounts
  'Executive Admin': [
    'create_vouchers',
    'upload_receipts',
    'submit_for_approval'
  ],
  'Executive Accounts': [
    'create_vouchers',
    'create_bills',
    'upload_receipts',
    'submit_for_approval'
  ],
  'Senior Executive Accounts': [
    'approve_bills',
    'export_reports',
    'lock_entries',
    'view_all_financials'
  ],
  
  // School Administrator - Cross-Department
  'School Administrator': [
    'view_all_dashboards',
    'override_approvals',
    'assign_temporary_roles',
    'generate_reports',
    'escalate_issues',
    'view_all_employees',
    'view_all_horses'
  ],
  
  // Director / Super Admin - Full Access
  'Director': [
    'full_system_access',
    'manage_all_roles',
    'revoke_approvals',
    'manage_master_data',
    'system_configuration',
    'override_any_decision'
  ],
  'Super Admin': [
    'full_system_access',
    'manage_all_roles',
    'system_configuration'
  ],
}

// API Endpoint Permissions
const ENDPOINT_PERMISSIONS: Record<string, string[]> = {
  'GET /api/employees': ['Ground Supervisor', 'Stable Manager', 'School Administrator', 'Director', 'Super Admin'],
  'POST /api/employees': ['Director', 'School Administrator', 'Super Admin'],
  'PUT /api/employees': ['Director', 'School Administrator'],
  
  'GET /api/horses': ['Groom', 'Riding Boy', 'Rider', 'Instructor', 'Stable Manager', 'Jamedar', 'Farrier', 'School Administrator', 'Director', 'Super Admin'],
  'POST /api/horses': ['Stable Manager', 'Director', 'Super Admin'],
  'PUT /api/horses': ['Stable Manager', 'Director'],
  
  'GET /api/attendance': ['Guard', 'Gardener', 'Housekeeping', 'Electrician', 'Ground Supervisor', 'School Administrator', 'Director'],
  'POST /api/attendance': ['Guard', 'Gardener', 'Housekeeping', 'Electrician'],
  
  'GET /api/gate-attendance': ['Guard', 'Ground Supervisor', 'School Administrator', 'Director'],
  'POST /api/gate-attendance': ['Guard'],
  
  'GET /api/medicine-logs': ['Jamedar', 'Stable Manager', 'Instructor', 'School Administrator', 'Director'],
  'POST /api/medicine-logs': ['Jamedar'],
  'PUT /api/medicine-logs': ['Stable Manager', 'Director'],
  
  'GET /api/tasks': ['all'],
  'POST /api/tasks': ['Ground Supervisor', 'Stable Manager', 'Director'],
  'PUT /api/tasks': ['Ground Supervisor', 'Stable Manager', 'Director'],
  
  'GET /api/approvals': ['Ground Supervisor', 'Stable Manager', 'School Administrator', 'Director'],
  'POST /api/approvals': ['Ground Supervisor', 'Stable Manager', 'Director'],
}

export interface AuthenticatedRequest extends NextApiRequest {
  user?: JwtPayload
}

export function getRoleHierarchy(role: string): number {
  return ROLE_HIERARCHY[role] || -1
}

export function getRolePermissions(role: string): string[] {
  return ROLE_PERMISSIONS[role] || []
}

export function hasPermission(role: string, permission: string): boolean {
  return getRolePermissions(role).includes(permission)
}

export function checkEndpointAccess(role: string, endpoint: string): boolean {
  const allowedRoles = ENDPOINT_PERMISSIONS[endpoint]
  if (!allowedRoles) return false
  if (allowedRoles.includes('all')) return true
  return allowedRoles.includes(role)
}

export function getDepartmentRoles(department: string): string[] {
  return DEPARTMENT_ROLES[department] || []
}

export function canApprove(role: string): boolean {
  const approvingRoles = ['Ground Supervisor', 'Stable Manager', 'Director', 'Super Admin', 'School Administrator']
  return approvingRoles.includes(role)
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
  const allowedRoles = ENDPOINT_PERMISSIONS[key]
  if (!allowedRoles) return true
  if (allowedRoles.includes('all')) return true
  return allowedRoles.includes(userRole)
}
