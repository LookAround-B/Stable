// pages/api/employees/[id]/approve.ts
import type { NextApiRequest, NextApiResponse } from 'next'
import { getTokenFromRequest, verifyToken } from '@/lib/auth'
import prisma from '@/lib/prisma'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Check authentication
  const token = getTokenFromRequest(req)
  const decoded = verifyToken(token || '')

  if (!decoded) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  // Only Super Admin, Director, or School Administrator can approve
  const allowedRoles = ['Super Admin', 'Director', 'School Administrator']
  if (!allowedRoles.includes(decoded.designation)) {
    return res.status(403).json({ error: 'Only admins can approve employees' })
  }

  if (req.method !== 'PATCH') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { id } = req.query

    if (typeof id !== 'string') {
      return res.status(400).json({ error: 'Invalid employee ID' })
    }

    // Update employee approval status
    const employee = await prisma.employee.update({
      where: { id },
      data: { isApproved: true },
      select: {
        id: true,
        fullName: true,
        email: true,
        designation: true,
        isApproved: true,
      },
    })

    return res.status(200).json({
      message: 'Employee approved successfully',
      employee,
    })
  } catch (error) {
    console.error('Error approving employee:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
