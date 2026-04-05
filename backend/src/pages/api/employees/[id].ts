// pages/api/employees/[id].ts
import type { NextApiRequest, NextApiResponse } from 'next'
import { getTokenFromRequest, verifyToken, checkPermission } from '@/lib/auth'
import { rememberJson } from '@/lib/cache'
import {
  cacheKeys,
  CACHE_TTL_SECONDS,
  invalidateEmployeeCaches,
  invalidateHorseCaches,
  invalidatePermissionCaches,
} from '@/lib/cacheKeys'
import prisma from '@/lib/prisma'
import { setCorsHeaders } from '@/lib/cors'

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

  const { id } = req.query

  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Employee ID is required' })
  }

  switch (req.method) {
    case 'GET':
      return handleGetEmployee(res, id)
    case 'DELETE':
      return handleDeleteEmployee(res, id, decoded)
    default:
      return res.status(405).json({ error: 'Method not allowed' })
  }
}

async function handleGetEmployee(res: NextApiResponse, id: string) {
  try {
    const employee = await rememberJson(
      cacheKeys.employeeDetail(id),
      CACHE_TTL_SECONDS.employeeDetail,
      async () =>
        prisma.employee.findUnique({
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
    )

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
  res: NextApiResponse,
  id: string,
  decoded: { id: string; email: string; designation: string }
) {
  try {
    const canManageEmployees = await checkPermission(decoded, 'manageEmployees')
    if (!canManageEmployees) {
      return res
        .status(403)
        .json({ error: 'You do not have permission to manage employees' })
    }

    if (id === decoded.id) {
      return res.status(400).json({ error: 'You cannot delete your own account' })
    }

    const employee = await prisma.employee.findUnique({
      where: { id },
      select: { id: true, fullName: true, designation: true },
    })

    if (!employee) {
      return res.status(404).json({ error: 'Employee not found' })
    }

    await prisma.$transaction(async (tx) => {
      await tx.approval.deleteMany({ where: { approverId: id } })

      const taskIds = (
        await tx.task.findMany({
          where: { OR: [{ createdById: id }, { assignedEmployeeId: id }] },
          select: { id: true },
        })
      ).map((task) => task.id)

      if (taskIds.length > 0) {
        await tx.approval.deleteMany({ where: { taskId: { in: taskIds } } })
      }

      await tx.task.deleteMany({
        where: { OR: [{ createdById: id }, { assignedEmployeeId: id }] },
      })
      await tx.fine.deleteMany({
        where: {
          OR: [{ issuedById: id }, { issuedToId: id }, { resolvedById: id }],
        },
      })
      await tx.report.deleteMany({
        where: {
          OR: [{ reportedEmployeeId: id }, { reporterEmployeeId: id }],
        },
      })
      await tx.auditLog.deleteMany({ where: { userId: id } })
      await tx.expense.deleteMany({
        where: { OR: [{ createdById: id }, { employeeId: id }] },
      })
      await tx.healthRecord.updateMany({
        where: { healthAdvisorId: id },
        data: { healthAdvisorId: null },
      })
      await tx.attendance.deleteMany({ where: { employeeId: id } })
      await tx.attendanceLog.deleteMany({ where: { employeeId: id } })
      await tx.groomWorkSheet.deleteMany({ where: { groomId: id } })
      await tx.gateEntry.deleteMany({
        where: { OR: [{ guardId: id }, { employeeId: id }] },
      })
      await tx.gateAttendanceLog.deleteMany({ where: { guardId: id } })
      await tx.instructorDailyWorkRecord.deleteMany({
        where: { OR: [{ instructorId: id }, { riderId: id }] },
      })
      await tx.horseFeed.deleteMany({ where: { recordedById: id } })
      await tx.inspectionRound.deleteMany({
        where: { OR: [{ jamedarId: id }, { resolvedById: id }] },
      })
      await tx.jamedarRoundCheck.deleteMany({ where: { jamedarId: id } })
      await tx.meetingParticipant.deleteMany({ where: { employeeId: id } })

      const meetingIds = (
        await tx.meeting.findMany({
          where: { createdById: id },
          select: { id: true },
        })
      ).map((meeting) => meeting.id)

      if (meetingIds.length > 0) {
        await tx.meetingMOM.deleteMany({ where: { meetingId: { in: meetingIds } } })
        await tx.meetingParticipant.deleteMany({
          where: { meetingId: { in: meetingIds } },
        })
      }

      await tx.meeting.deleteMany({ where: { createdById: id } })
      await tx.medicineLog.deleteMany({ where: { jamiedarId: id } })
      await tx.horseCareTeam.deleteMany({ where: { staffId: id } })
      await tx.notification.deleteMany({ where: { employeeId: id } })
      await tx.employee.updateMany({
        where: { supervisorId: id },
        data: { supervisorId: null },
      })
      await tx.horse.updateMany({
        where: { supervisorId: id },
        data: { supervisorId: null },
      })
      await tx.employee.delete({ where: { id } })
    })

    await Promise.all([
      invalidateEmployeeCaches(id),
      invalidatePermissionCaches(id),
      invalidateHorseCaches(),
    ])

    return res.status(200).json({
      message: `Employee "${employee.fullName}" has been deleted successfully`,
    })
  } catch (error) {
    console.error('Error deleting employee:', error)
    return res.status(500).json({ error: 'Failed to delete employee' })
  }
}
