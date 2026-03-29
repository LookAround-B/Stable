// pages/api/reports/index.ts
import type { NextApiRequest, NextApiResponse } from 'next'
import { getTokenFromRequest, verifyToken, checkPermission } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { setCorsHeaders } from '@/lib/cors'
import { sanitizeString, isValidString, isValidId, safePositiveInt } from '@/lib/validate'
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const origin = req.headers.origin
  setCorsHeaders(res, origin as string | undefined)

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  const token = getTokenFromRequest(req as any)
  if (!token || !verifyToken(token)) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  // Permission check: viewReports
  const decoded = verifyToken(token)!
  const allowed = await checkPermission(decoded, 'viewReports')
  if (!allowed) {
    return res.status(403).json({ error: 'You do not have permission to view reports' })
  }

  switch (req.method) {
    case 'GET':
      return handleGetReports(req, res)
    case 'POST':
      return handleCreateReport(req, res)
    default:
      return res.status(405).json({ error: 'Method not allowed' })
  }
}

async function handleGetReports(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { status, skip = 0, take = 10 } = req.query

    const statusValue = Array.isArray(status) ? status[0] : status
    const where = statusValue ? { status: statusValue } : {}

    const reports = await prisma.report.findMany({
      where,
      skip: safePositiveInt(skip, 0),
      take: safePositiveInt(take, 10, 100),
      include: {
        reportedEmployee: true,
        reporter: true,
      },
      orderBy: { createdAt: 'desc' },
    })

    const total = await prisma.report.count({ where })

    return res.status(200).json({
      data: reports,
      pagination: { total, skip, take },
    })
  } catch (error) {
    console.error('Error fetching reports:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}

async function handleCreateReport(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { reportedEmployeeId, reporterEmployeeId, reason, category, taskId } =
      req.body

    if (!isValidId(reportedEmployeeId)) {
      return res.status(400).json({ error: 'Valid reportedEmployeeId is required' })
    }
    if (!isValidId(reporterEmployeeId)) {
      return res.status(400).json({ error: 'Valid reporterEmployeeId is required' })
    }
    if (!isValidString(reason, 1, 1000)) {
      return res.status(400).json({ error: 'Reason is required (max 1000 chars)' })
    }
    if (category && !isValidString(category, 1, 100)) {
      return res.status(400).json({ error: 'Category must be max 100 chars' })
    }
    if (taskId && !isValidId(taskId)) {
      return res.status(400).json({ error: 'Invalid taskId' })
    }

    const report = await prisma.report.create({
      data: {
        reportedEmployeeId,
        reporterEmployeeId,
        reason: sanitizeString(reason),
        category: category ? sanitizeString(category) : undefined,
        taskId: taskId || undefined,
        status: 'Pending',
      },
    })

    return res.status(201).json(report)
  } catch (error) {
    console.error('Error creating report:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}

