// pages/api/health-records/index.ts
import type { NextApiRequest, NextApiResponse } from 'next'
import { getTokenFromRequest, verifyToken } from '@/lib/auth'
import prisma from '@/lib/prisma'
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  const token = getTokenFromRequest(req as any)
  if (!token || !verifyToken(token)) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  switch (req.method) {
    case 'GET':
      return handleGetHealthRecords(req, res)
    case 'POST':
      return handleCreateHealthRecord(req, res)
    default:
      return res.status(405).json({ error: 'Method not allowed' })
  }
}

async function handleGetHealthRecords(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { horseId, recordType, skip = 0, take = 10 } = req.query

    const where: any = {}
    if (horseId) where.horseId = horseId
    if (recordType) where.recordType = recordType

    const records = await prisma.healthRecord.findMany({
      where,
      skip: parseInt(skip as string),
      take: parseInt(take as string),
      include: {
        horse: true,
        healthAdvisor: true,
      },
      orderBy: { date: 'desc' },
    })

    const total = await prisma.healthRecord.count({ where })

    return res.status(200).json({
      data: records,
      pagination: { total, skip, take },
    })
  } catch (error) {
    console.error('Error fetching health records:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}

async function handleCreateHealthRecord(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { horseId, healthAdvisorId, recordType, description, date, nextDueDate } =
      req.body

    if (!horseId || !recordType || !date) {
      return res.status(400).json({ error: 'Missing required fields' })
    }

    const record = await prisma.healthRecord.create({
      data: {
        horseId,
        healthAdvisorId,
        recordType,
        description,
        date: new Date(date),
        nextDueDate: nextDueDate ? new Date(nextDueDate) : null,
      },
    })

    return res.status(201).json(record)
  } catch (error) {
    console.error('Error creating health record:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}

