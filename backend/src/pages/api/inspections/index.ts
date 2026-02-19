import type { NextApiRequest, NextApiResponse } from 'next'
import { getTokenFromRequest, verifyToken } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { runMiddleware } from '@/lib/cors'
import cors from 'cors'

const corsMiddleware = cors({
  origin: ['http://localhost:3001', 'http://localhost:3002', 'http://localhost:3000'],
  credentials: true,
})

async function handleGetInspections(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { round, horseId, severityLevel, startDate, endDate, jamedarId } = req.query
    const token = getTokenFromRequest(req as any)
    if (!token) {
      return res.status(401).json({ error: 'Unauthorized' })
    }
    const decoded = verifyToken(token)
    const userId = decoded?.id
    const userDesignation = decoded?.designation

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    const where: any = {}

    if (round) where.round = round
    if (horseId) where.horseId = horseId
    if (severityLevel) where.severityLevel = severityLevel

    if (startDate || endDate) {
      where.createdAt = {}
      if (startDate) where.createdAt.gte = new Date(startDate as string)
      if (endDate) {
        const end = new Date(endDate as string)
        end.setHours(23, 59, 59, 999)
        where.createdAt.lte = end
      }
    }

    // Jamedar sees only their own, Managers see all
    if (userDesignation === 'Jamedar') {
      where.jamedarId = userId
    } else if (jamedarId) {
      where.jamedarId = jamedarId
    }

    const inspections = await prisma.inspectionRound.findMany({
      where,
      include: {
        jamedar: {
          select: { id: true, fullName: true, designation: true, email: true },
        },
        horse: {
          select: { id: true, name: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    res.status(200).json({ inspections })
  } catch (error) {
    console.error('❌ Error fetching inspections:', error)
    res.status(500).json({ error: 'Failed to fetch inspections' })
  }
}

async function handleCreateInspection(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { round, description, horseId, location, severityLevel, image } = req.body
    const token = getTokenFromRequest(req as any)
    if (!token) {
      return res.status(401).json({ error: 'Unauthorized' })
    }
    const decoded = verifyToken(token)
    const jamedarId = decoded?.id

    if (!jamedarId) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    // Validation
    if (!round || !description || !location || !severityLevel || !image) {
      return res.status(400).json({
        error: 'Round, description, location, severity level, and image are required',
      })
    }

    if (!['Morning', 'Afternoon', 'Evening'].includes(round)) {
      return res.status(400).json({ error: 'Invalid round. Must be Morning, Afternoon, or Evening' })
    }

    if (!['Low', 'Medium', 'High', 'Critical'].includes(severityLevel)) {
      return res.status(400).json({ error: 'Invalid severity level. Must be Low, Medium, High, or Critical' })
    }

    if (description.length > 500) {
      return res.status(400).json({ error: 'Description cannot exceed 500 characters' })
    }

    if (location.length > 100) {
      return res.status(400).json({ error: 'Location cannot exceed 100 characters' })
    }

    // Handle image upload
    let imageUrl = image
    const { uploadImage } = await import('@/lib/s3')
    
    if (image && typeof image === 'object' && image.data) {
      console.log('[Object] File upload:', image.name)
      try {
        const buffer = Buffer.from(image.data, 'base64')
        imageUrl = await uploadImage(buffer, image.name, image.type, 'inspections')
        console.log('✅ Image uploaded:', imageUrl)
      } catch (uploadError) {
        console.error('❌ Image upload failed:', uploadError)
        return res.status(500).json({ error: 'Failed to upload image' })
      }
    } else if (image && typeof image === 'string' && image.startsWith('data:')) {
      console.log('[String] Data URL format')
      try {
        const [header, ...dataParts] = image.split(',')
        const mimeType = header.match(/:(.*?);/)?.[1] || 'image/jpeg'
        const buffer = Buffer.from(dataParts.join(','), 'base64')
        const timestamp = Date.now()
        const filename = `${timestamp}-inspection.${mimeType.split('/')[1]}`
        imageUrl = await uploadImage(buffer, filename, mimeType, 'inspections')
        console.log('✅ Image uploaded:', imageUrl)
      } catch (uploadError) {
        console.error('❌ Image upload failed:', uploadError)
        return res.status(500).json({ error: 'Failed to upload image' })
      }
    }

    // Validate horse exists if provided
    if (horseId) {
      const horse = await prisma.horse.findUnique({ where: { id: horseId } })
      if (!horse) {
        return res.status(404).json({ error: 'Horse not found' })
      }
    }

    // Create inspection
    const inspection = await prisma.inspectionRound.create({
      data: {
        jamedarId,
        round,
        image: imageUrl,
        description,
        horseId: horseId || null,
        location,
        severityLevel,
      },
      include: {
        jamedar: {
          select: { id: true, fullName: true, designation: true, email: true },
        },
        horse: {
          select: { id: true, name: true },
        },
      },
    })

    console.log('✅ Inspection created:', inspection.id)
    res.status(201).json({ inspection })
  } catch (error) {
    console.error('❌ Error creating inspection:', error)
    res.status(500).json({ error: 'Failed to create inspection' })
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Run CORS middleware
  await runMiddleware(req, res, corsMiddleware)

  // Check authentication
  const token = getTokenFromRequest(req as any)
  if (!token || !verifyToken(token)) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  switch (req.method) {
    case 'GET':
      return handleGetInspections(req, res)
    case 'POST':
      // Check if user is Jamedar
      if (!token) {
        return res.status(401).json({ error: 'Unauthorized' })
      }
      const decoded = verifyToken(token)
      if (decoded?.designation !== 'Jamedar') {
        return res.status(403).json({ error: 'Only Jamedar can create inspections' })
      }
      return handleCreateInspection(req, res)
    default:
      return res.status(405).json({ error: 'Method not allowed' })
  }
}
