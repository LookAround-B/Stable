// pages/api/horses/index.ts
import type { NextApiRequest, NextApiResponse } from 'next'
import { getTokenFromRequest, verifyToken } from '@/lib/auth'
import prisma from '@/lib/prisma'
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === 'OPTIONS') {
    return res.status(200).end()
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

  switch (req.method) {
    case 'GET':
      return handleGetHorses(req, res)
    case 'POST':
      return handleCreateHorse(req, res)
    default:
      return res.status(405).json({ error: 'Method not allowed' })
  }
}

async function handleGetHorses(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { status, skip = 0, take = 1000 } = req.query

    const statusValue = Array.isArray(status) ? status[0] : status
    const where = statusValue ? { status: statusValue } : {}

    const horses = await prisma.horse.findMany({
      where,
      skip: parseInt(skip as string),
      take: parseInt(take as string),
      orderBy: { name: 'asc' },
      include: {
        supervisor: true,
      }
    })

    const total = await prisma.horse.count({ where })

    return res.status(200).json({
      data: horses,
      pagination: { total, skip, take },
    })
  } catch (error) {
    console.error('Error fetching horses:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}

async function handleCreateHorse(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { name, gender, dateOfBirth, breed, color, height, stableNumber, supervisorId, status } = req.body

    if (!name || !gender || !dateOfBirth) {
      return res.status(400).json({ error: 'Missing required fields' })
    }

    const horse = await prisma.horse.create({
      data: {
        name,
        gender,
        dateOfBirth: new Date(dateOfBirth),
        breed,
        color,
        height: height ? parseFloat(height) : null,
        stableNumber: stableNumber || null,
        supervisorId: supervisorId || null,
        status: status || 'Active',
      },
      include: {
        supervisor: true,
      }
    })

    return res.status(201).json(horse)
  } catch (error) {
    console.error('Error creating horse:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}

