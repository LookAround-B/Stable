// pages/api/employees/[id].ts
import type { NextApiRequest, NextApiResponse } from 'next'
import { getTokenFromRequest, verifyToken } from '@/lib/auth'
import prisma from '@/lib/prisma'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Cross-Origin-Opener-Policy', 'unsafe-none');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Check authentication
  const token = getTokenFromRequest(req as any)
  if (!token) {
    return res.status(401).json({ error: 'No authorization header' })
  }

  const decoded = verifyToken(token)
  if (!decoded) {
    return res.status(401).json({ error: 'Invalid or expired token' })
  }

  const { id } = req.query

  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Employee ID is required' })
  }

  switch (req.method) {
    case 'GET':
      return handleGetEmployee(req, res, id)
    case 'DELETE':
      return handleDeleteEmployee(req, res, id, decoded)
    default:
      return res.status(405).json({ error: 'Method not allowed' })
  }
}

async function handleGetEmployee(
  _req: NextApiRequest,
  res: NextApiResponse,
  id: string
) {
  try {
    const employee = await prisma.employee.findUnique({
      where: { id },
      select: {
        id: true,
        fullName: true,
        email: true,
        designation: true,
        department: true,
        phoneNumber: true,
        profileImage: true,
        employmentStatus: true,
        isApproved: true,
        colorCode: true,
        supervisor: {
          select: { id: true, fullName: true, designation: true },
        },
      },
    })

    if (!employee) {
      return res.status(404).json({ error: 'Employee not found' })
    }

    return res.status(200).json(employee)
  } catch (error) {
    console.error('Error fetching employee:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}

async function handleDeleteEmployee(
  _req: NextApiRequest,
  res: NextApiResponse,
  id: string,
  decoded: { id: string; email: string; designation: string }
) {
  try {
    // Only Director can delete employees
    const ALLOWED_ROLES = ['Director']

    // Get the user's current designation from DB (in case JWT is stale)
    const currentUser = await prisma.employee.findUnique({
      where: { id: decoded.id },
      select: { designation: true },
    })

    if (!currentUser || !ALLOWED_ROLES.includes(currentUser.designation)) {
      return res.status(403).json({ error: 'Only Directors can delete employees' })
    }

    // Prevent deleting yourself
    if (id === decoded.id) {
      return res.status(400).json({ error: 'You cannot delete your own account' })
    }

    // Check if employee exists
    const employee = await prisma.employee.findUnique({
      where: { id },
      select: { id: true, fullName: true, designation: true },
    })

    if (!employee) {
      return res.status(404).json({ error: 'Employee not found' })
    }

    // Delete ALL related records explicitly before deleting employee
    await prisma.$transaction(async (tx) => {
      // 1. Approvals where this employee is the approver
      await tx.approval.deleteMany({ where: { approverId: id } })

      // 2. Approvals linked to tasks created/assigned to this employee
      const taskIds = (
        await tx.task.findMany({
          where: { OR: [{ createdById: id }, { assignedEmployeeId: id }] },
          select: { id: true },
        })
      ).map((t) => t.id)
      if (taskIds.length > 0) {
        await tx.approval.deleteMany({ where: { taskId: { in: taskIds } } })
      }

      // 3. Tasks
      await tx.task.deleteMany({ where: { OR: [{ createdById: id }, { assignedEmployeeId: id }] } })

      // 4. Fines
      await tx.fine.deleteMany({ where: { OR: [{ issuedById: id }, { issuedToId: id }, { resolvedById: id }] } })

      // 5. Reports
      await tx.report.deleteMany({ where: { OR: [{ reportedEmployeeId: id }, { reporterEmployeeId: id }] } })

      // 6. Audit logs
      await tx.auditLog.deleteMany({ where: { userId: id } })

      // 7. Expenses (created by OR assigned to)
      await tx.expense.deleteMany({ where: { OR: [{ createdById: id }, { employeeId: id }] } })

      // 8. Nullify health record advisor references (optional FK)
      await tx.healthRecord.updateMany({ where: { healthAdvisorId: id }, data: { healthAdvisorId: null } })

      // 9. Attendance records
      await tx.attendance.deleteMany({ where: { employeeId: id } })

      // 10. Attendance logs
      await tx.attendanceLog.deleteMany({ where: { employeeId: id } })

      // 11. Groom worksheets (cascades to WorkSheetEntry)
      await tx.groomWorkSheet.deleteMany({ where: { groomId: id } })

      // 12. Gate entries (as guard or as employee)
      await tx.gateEntry.deleteMany({ where: { OR: [{ guardId: id }, { employeeId: id }] } })

      // 13. Gate attendance logs
      await tx.gateAttendanceLog.deleteMany({ where: { guardId: id } })

      // 14. EIRS / Instructor daily work records
      await tx.instructorDailyWorkRecord.deleteMany({ where: { OR: [{ instructorId: id }, { riderId: id }] } })

      // 15. Horse feed records
      await tx.horseFeed.deleteMany({ where: { recordedById: id } })

      // 16. Inspection rounds (as jamedar or resolver)
      await tx.inspectionRound.deleteMany({ where: { OR: [{ jamedarId: id }, { resolvedById: id }] } })

      // 17. Jamedar round checks
      await tx.jamedarRoundCheck.deleteMany({ where: { jamedarId: id } })

      // 18. Meeting participants, then meetings (cascade handles MOM + participants)
      await tx.meetingParticipant.deleteMany({ where: { employeeId: id } })
      const meetingIds = (
        await tx.meeting.findMany({ where: { createdById: id }, select: { id: true } })
      ).map((m) => m.id)
      if (meetingIds.length > 0) {
        await tx.meetingMOM.deleteMany({ where: { meetingId: { in: meetingIds } } })
        await tx.meetingParticipant.deleteMany({ where: { meetingId: { in: meetingIds } } })
      }
      await tx.meeting.deleteMany({ where: { createdById: id } })

      // 19. Medicine logs
      await tx.medicineLog.deleteMany({ where: { jamiedarId: id } })

      // 20. Horse care team assignments
      await tx.horseCareTeam.deleteMany({ where: { staffId: id } })

      // 21. Notifications
      await tx.notification.deleteMany({ where: { employeeId: id } })

      // 22. Remove supervisor references from other employees
      await tx.employee.updateMany({ where: { supervisorId: id }, data: { supervisorId: null } })

      // 23. Remove horse supervisor references
      await tx.horse.updateMany({ where: { supervisorId: id }, data: { supervisorId: null } })

      // 24. Finally delete the employee
      await tx.employee.delete({ where: { id } })
    })

    return res.status(200).json({
      message: `Employee "${employee.fullName}" has been deleted successfully`,
    })
  } catch (error) {
    console.error('Error deleting employee:', error)
    return res.status(500).json({ error: 'Failed to delete employee' })
  }
}
