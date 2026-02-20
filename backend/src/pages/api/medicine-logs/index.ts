import type { NextApiRequest, NextApiResponse } from 'next'

import prisma from '@/lib/prisma'
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Cross-Origin-Opener-Policy', 'unsafe-none');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  if (req.method === 'GET') {
    return handleGet(req, res)
  } else if (req.method === 'POST') {
    return handlePost(req, res)
  } else if (req.method === 'PUT') {
    return handlePut(req, res)
  } else {
    return res.status(405).json({ error: 'Method not allowed' })
  }
}

async function handleGet(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { jamiedarId, horseId, startDate, endDate, isApproved } = req.query

    let whereClause: any = {}

    if (jamiedarId) {
      whereClause.jamiedarId = jamiedarId
    }

    if (horseId) {
      whereClause.horseId = horseId
    }

    if (isApproved !== undefined) {
      whereClause.isApproved = isApproved === 'true'
    }

    if (startDate || endDate) {
      whereClause.timeAdministered = {}
      if (startDate) {
        whereClause.timeAdministered.gte = new Date(startDate as string)
      }
      if (endDate) {
        whereClause.timeAdministered.lte = new Date(endDate as string)
      }
    }

    const logs = await prisma.medicineLog.findMany({
      where: whereClause,
      include: {
        jamedar: {
          select: {
            id: true,
            fullName: true,
            designation: true,
          },
        },
        horse: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        timeAdministered: 'desc',
      },
    })

    return res.status(200).json(logs)
  } catch (error) {
    console.error('Error fetching medicine logs:', error)
    return res.status(500).json({ error: 'Failed to fetch medicine logs' })
  }
}

async function handlePost(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { jamiedarId, horseId, medicineName, quantity, timeAdministered, notes, photoUrl } = req.body

    // Validate required fields
    if (!jamiedarId || !horseId || !medicineName || !quantity || !timeAdministered) {
      return res.status(400).json({
        error: 'jamiedarId, horseId, medicineName, quantity, and timeAdministered are required',
      })
    }

    // Check if jamedar exists
    const jamedar = await prisma.employee.findUnique({
      where: { id: jamiedarId },
    })

    if (!jamedar || jamedar.designation !== 'Jamedar') {
      return res.status(404).json({ error: 'Jamedar not found' })
    }

    // Check if horse exists
    const horse = await prisma.horse.findUnique({
      where: { id: horseId },
    })

    if (!horse) {
      return res.status(404).json({ error: 'Horse not found' })
    }

    // Create medicine log
    const log = await prisma.medicineLog.create({
      data: {
        jamiedarId,
        horseId,
        medicineName,
        quantity,
        timeAdministered: new Date(timeAdministered),
        notes: notes || null,
        photoUrl: photoUrl || null,
      },
      include: {
        jamedar: {
          select: {
            id: true,
            fullName: true,
            designation: true,
          },
        },
        horse: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    })

    return res.status(201).json(log)
  } catch (error) {
    console.error('Error creating medicine log:', error)
    return res.status(500).json({ error: 'Failed to create medicine log' })
  }
}

async function handlePut(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { id, isApproved, approvedBy } = req.body

    if (!id) {
      return res.status(400).json({ error: 'id is required' })
    }

    // Check if log exists
    const log = await prisma.medicineLog.findUnique({
      where: { id },
    })

    if (!log) {
      return res.status(404).json({ error: 'Medicine log not found' })
    }

    // Update medicine log
    const updatedLog = await prisma.medicineLog.update({
      where: { id },
      data: {
        isApproved: isApproved !== undefined ? isApproved : log.isApproved,
        approvedBy: approvedBy || null,
      },
      include: {
        jamedar: {
          select: {
            id: true,
            fullName: true,
            designation: true,
          },
        },
        horse: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    })

    return res.status(200).json(updatedLog)
  } catch (error) {
    console.error('Error updating medicine log:', error)
    return res.status(500).json({ error: 'Failed to update medicine log' })
  }
}

