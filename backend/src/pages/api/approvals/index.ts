// pages/api/approvals/index.ts
import type { NextApiRequest, NextApiResponse } from 'next'
import { verifyToken } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { setCorsHeaders } from '@/lib/cors'
import { isValidId, isValidString, sanitizeString, safePositiveInt } from '@/lib/validate'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const origin = req.headers.origin
  setCorsHeaders(res, origin as string | undefined)

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  // Verify authentication
  const authHeader = req.headers.authorization
  const token = authHeader?.replace('Bearer ', '')
  
  if (!token || !verifyToken(token)) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  switch (req.method) {
    case 'GET':
      return handleGetApprovals(req, res)
    case 'POST':
      return handleCreateApproval(req, res)
    default:
      return res.status(405).json({ error: 'Method not allowed' })
  }
}

async function handleGetApprovals(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { status, skip = 0, take = 10 } = req.query

    const statusValue = Array.isArray(status) ? status[0] : status
    const where = statusValue ? { status: statusValue } : {}

    const approvals = await prisma.approval.findMany({
      where,
      skip: safePositiveInt(skip, 0),
      take: safePositiveInt(take, 10, 100),
      include: {
        task: { include: { horse: true, assignedEmployee: true } },
        approver: true,
      },
      orderBy: { createdAt: 'desc' },
    })

    const total = await prisma.approval.count({ where })

    return res.status(200).json({
      data: approvals,
      pagination: { total, skip, take },
    })
  } catch (error) {
    console.error('Error fetching approvals:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}

async function handleCreateApproval(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { taskId, approverId, approverLevel } = req.body

    if (!isValidId(taskId)) {
      return res.status(400).json({ error: 'Valid taskId is required' })
    }
    if (!isValidId(approverId)) {
      return res.status(400).json({ error: 'Valid approverId is required' })
    }
    if (!isValidString(approverLevel, 1, 100)) {
      return res.status(400).json({ error: 'approverLevel is required (max 100 chars)' })
    }

    const approval = await prisma.approval.create({
      data: {
        taskId,
        approverId,
        approverLevel: sanitizeString(approverLevel),
        status: 'Pending',
      },
    })

    return res.status(201).json(approval)
  } catch (error) {
    console.error('Error creating approval:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}

