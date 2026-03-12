import type { NextApiRequest, NextApiResponse } from 'next'
import { getTokenFromRequest, verifyToken } from '@/lib/auth'

import prisma from '@/lib/prisma'

async function handleGetInspections(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { round, horseId, severityLevel, area, startDate, endDate, jamedarId } = req.query
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
    if (area) where.area = area

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
    const { round, description, horseId, location, area, severityLevel, images } = req.body
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
    if (!round || !description || !location || !severityLevel) {
      return res.status(400).json({
        error: 'Round, description, location, and severity level are required',
      })
    }

    if (!images || !Array.isArray(images) || images.length === 0) {
      return res.status(400).json({ error: 'At least one image is required' })
    }

    if (images.length > 8) {
      return res.status(400).json({ error: 'Maximum 8 images allowed per inspection' })
    }

    const VALID_AREAS = [
      'Pony stables', 'Rear Paddocks', 'Private stables', 'Front office stables',
      'Warm up arena', 'Jumping arena', 'Dressage arena', 'Camp Area',
      'Forest Trail', 'Accommodation', 'Middle school', 'Top school',
      'Gazebo area', 'Grooms rooms', 'Round yard', 'Paddocks'
    ]

    if (area && !VALID_AREAS.includes(area)) {
      return res.status(400).json({ error: 'Invalid area selected' })
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

    // Upload all images
    const { uploadImage } = await import('@/lib/s3')
    const imageUrls: string[] = []

    for (const imgData of images) {
      try {
        if (typeof imgData === 'string' && imgData.startsWith('data:')) {
          const [header, ...dataParts] = imgData.split(',')
          const mimeType = header.match(/:(.*?);/)?.[1] || 'image/jpeg'
          const buffer = Buffer.from(dataParts.join(','), 'base64')
          const timestamp = Date.now() + Math.random()
          const filename = `${timestamp}-inspection.${mimeType.split('/')[1]}`
          const url = await uploadImage(buffer, filename, mimeType, 'inspections')
          imageUrls.push(url)
        } else if (typeof imgData === 'string' && imgData.startsWith('http')) {
          imageUrls.push(imgData) // already uploaded URL (edit scenario)
        }
      } catch (uploadError) {
        console.error('\u274c Image upload failed:', uploadError)
        return res.status(500).json({ error: 'Failed to upload one or more images' })
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
        images: imageUrls,
        description,
        horseId: horseId || null,
        location,
        area: area || null,
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

    console.log('\u2705 Inspection created:', inspection.id)
    res.status(201).json({ inspection })
  } catch (error) {
    console.error('\u274c Error creating inspection:', error)
    res.status(500).json({ error: 'Failed to create inspection' })
  }
}

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
      const decoded = verifyToken(token)
      if (decoded?.designation !== 'Jamedar') {
        return res.status(403).json({ error: 'Only Jamedar can create inspections' })
      }
      return handleCreateInspection(req, res)
    default:
      return res.status(405).json({ error: 'Method not allowed' })
  }
}

