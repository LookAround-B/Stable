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

    // Delete all related records first (cascade may handle some, but be explicit)
    // Delete in order of dependencies
    await prisma.$transaction(async (tx) => {
      // Delete approvals where this employee is the approver
      await tx.approval.deleteMany({ where: { approverId: id } })
      // Delete approvals on tasks created by or assigned to this employee
      const tasksOfEmployee = await tx.task.findMany({
        where: { OR: [{ createdById: id }, { assignedEmployeeId: id }] },
        select: { id: true },
      })
      if (tasksOfEmployee.length > 0) {
        await tx.approval.deleteMany({
          where: { taskId: { in: tasksOfEmployee.map(t => t.id) } },
        })
      }

      // Delete tasks
      await tx.task.deleteMany({ where: { OR: [{ createdById: id }, { assignedEmployeeId: id }] } })

      // Delete fines
      await tx.fine.deleteMany({ where: { OR: [{ issuedById: id }, { issuedToId: id }, { resolvedById: id }] } })

      // Delete attendance records
      await tx.attendance.deleteMany({ where: { OR: [{ employeeId: id }, { markedById: id }] } })

      // Delete groom worksheets  
      await tx.groomWorkSheet.deleteMany({ where: { employeeId: id } })

      // Delete gate entries
      await tx.gateEntry.deleteMany({ where: { guardId: id } })

      // Delete EIRS records
      await tx.instructorDailyWorkRecord.deleteMany({ where: { OR: [{ instructorId: id }, { riderId: id }] } })

      // Delete expenses
      await tx.expense.deleteMany({ where: { submittedById: id } })

      // Delete inspection rounds
      await tx.inspectionRound.deleteMany({ where: { inspectorId: id } })

      // Remove supervisor references from other employees
      await tx.employee.updateMany({
        where: { supervisorId: id },
        data: { supervisorId: null },
      })

      // Finally delete the employee
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
