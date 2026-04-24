import type { NextApiRequest, NextApiResponse } from 'next'
import { getTokenFromRequest, verifyToken } from '@/lib/auth'
import { setCorsHeaders } from '@/lib/cors'
import prisma from '@/lib/prisma'

const MINIMUM_INCENTIVE_AMOUNT = 1400

const ADMIN_DESIGNATIONS = [
  'Super Admin',
  'Director',
  'School Administrator',
  'Stable Manager',
]

const SUPER_ADMIN_DESIGNATIONS = [
  'Super Admin',
  'Director',
  'School Administrator',
]

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  setCorsHeaders(res, req.headers.origin as string | undefined)

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

  switch (req.method) {
    case 'PATCH':
      if (!ADMIN_DESIGNATIONS.includes(decoded.designation)) {
        return res.status(403).json({ error: 'You do not have permission to manage incentives' })
      }
      return handleUpdateIncentive(req, res, decoded, id as string)
    case 'DELETE':
      if (!SUPER_ADMIN_DESIGNATIONS.includes(decoded.designation)) {
        return res.status(403).json({ error: 'You do not have permission to delete incentives' })
      }
      return handleDeleteIncentive(req, res, id as string)
    default:
      return res.status(405).json({ error: 'Method not allowed' })
  }
}

async function handleUpdateIncentive(
  req: NextApiRequest,
  res: NextApiResponse,
  decoded: { id: string },
  id: string
) {
  try {
    const { amount, paymentMode, description, lessonCount, notes, status } = req.body

    const existing = await prisma.instructorIncentive.findUnique({ where: { id } })
    if (!existing) {
      return res.status(404).json({ error: 'Incentive not found' })
    }

    if (amount !== undefined && parseFloat(amount) < MINIMUM_INCENTIVE_AMOUNT) {
      return res.status(400).json({
        error: `Incentive amount must be at least ₹${MINIMUM_INCENTIVE_AMOUNT}`,
      })
    }

    const updateData: Record<string, any> = {}
    if (amount !== undefined) updateData.amount = parseFloat(amount)
    if (paymentMode !== undefined) updateData.paymentMode = paymentMode
    if (description !== undefined) updateData.description = description
    if (lessonCount !== undefined) updateData.lessonCount = parseInt(lessonCount)
    if (notes !== undefined) updateData.notes = notes

    if (status !== undefined) {
      updateData.status = status
      if (status === 'Approved' || status === 'Rejected') {
        updateData.approvedById = decoded.id
      }
      if (status === 'Paid') {
        updateData.paidAt = new Date()
      }
    }

    const incentive = await prisma.instructorIncentive.update({
      where: { id },
      data: updateData,
      include: {
        instructor: { select: { id: true, fullName: true, designation: true } },
        approvedBy: { select: { id: true, fullName: true } },
        createdBy: { select: { id: true, fullName: true } },
      },
    })

    return res.status(200).json({ data: incentive, message: 'Incentive updated successfully' })
  } catch (error) {
    console.error('Error updating instructor incentive:', error)
    return res.status(500).json({ error: 'Failed to update incentive' })
  }
}

async function handleDeleteIncentive(
  _req: NextApiRequest,
  res: NextApiResponse,
  id: string
) {
  try {
    const existing = await prisma.instructorIncentive.findUnique({ where: { id } })
    if (!existing) {
      return res.status(404).json({ error: 'Incentive not found' })
    }

    if (existing.status === 'Paid') {
      return res.status(400).json({ error: 'Cannot delete a paid incentive' })
    }

    await prisma.instructorIncentive.delete({ where: { id } })

    return res.status(200).json({ message: 'Incentive deleted successfully' })
  } catch (error) {
    console.error('Error deleting instructor incentive:', error)
    return res.status(500).json({ error: 'Failed to delete incentive' })
  }
}
