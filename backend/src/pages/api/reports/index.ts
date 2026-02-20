// pages/api/reports/index.ts
import type { NextApiRequest, NextApiResponse } from 'next'
import { getTokenFromRequest, verifyToken } from '@/lib/auth'
import prisma from '@/lib/prisma'
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Run CORS middlewareconst token = getTokenFromRequest(req as any)
  if (!token || !verifyToken(token)) {
    return res.status(401).json({ error: 'Unauthorized' })
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
      skip: parseInt(skip as string),
      take: parseInt(take as string),
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

    if (!reportedEmployeeId || !reporterEmployeeId || !reason) {
      return res.status(400).json({ error: 'Missing required fields' })
    }

    const report = await prisma.report.create({
      data: {
        reportedEmployeeId,
        reporterEmployeeId,
        reason,
        category,
        taskId,
        status: 'Pending',
      },
    })

    return res.status(201).json(report)
  } catch (error) {
    console.error('Error creating report:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}

