import type { NextApiRequest, NextApiResponse } from 'next'
import {
  checkPermission,
  getTaskCapabilitiesForUser,
  getTokenFromRequest,
  verifyToken,
} from '@/lib/auth'
import prisma from '@/lib/prisma'
import { setCorsHeaders } from '@/lib/cors'
import { sanitizeString } from '@/lib/validate'

const VALID_AREAS = [
  'Pony stables',
  'Rear Paddocks',
  'Private stables',
  'Front office stables',
  'Warm up arena',
  'Jumping arena',
  'Dressage arena',
  'Camp Area',
  'Forest Trail',
  'Accommodation',
  'Middle school',
  'Top school',
  'Gazebo area',
  'Grooms rooms',
  'Round yard',
  'Paddocks',
]

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const origin = req.headers.origin
  setCorsHeaders(res, origin as string | undefined)

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  const token = getTokenFromRequest(req as any)
  if (!token) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const decoded = verifyToken(token)
  if (!decoded) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  switch (req.method) {
    case 'GET':
      return handleGetInspections(req, res, decoded)
    case 'POST':
      return handleCreateInspection(req, res, decoded)
    default:
      return res.status(405).json({ error: 'Method not allowed' })
  }
}

async function handleGetInspections(
  req: NextApiRequest,
  res: NextApiResponse,
  decoded: { id: string; designation: string; email: string }
) {
  try {
    const { round, horseId, severityLevel, area, startDate, endDate, jamedarId } =
      req.query

    const canManageSchedules = await checkPermission(decoded, 'manageSchedules')
    const taskCapabilities = await getTaskCapabilitiesForUser(
      decoded.id,
      decoded.designation
    )
    const canViewAll =
      canManageSchedules || taskCapabilities.canViewAllInspections
    const canViewOwn = taskCapabilities.canCreateInspections

    if (!canViewAll && !canViewOwn) {
      return res.status(403).json({
        error: 'Inspection access is not enabled for your account.',
      })
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

    if (!canViewAll) {
      where.jamedarId = decoded.id
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
    console.error('Error fetching inspections:', error)
    res.status(500).json({ error: 'Failed to fetch inspections' })
  }
}

async function handleCreateInspection(
  req: NextApiRequest,
  res: NextApiResponse,
  decoded: { id: string; designation: string; email: string }
) {
  try {
    const { round, description, horseId, location, area, severityLevel, images } =
      req.body

    const taskCapabilities = await getTaskCapabilitiesForUser(
      decoded.id,
      decoded.designation
    )

    if (!taskCapabilities.canCreateInspections) {
      return res.status(403).json({
        error: 'Inspection creation is not enabled for your account.',
      })
    }

    if (!round || !description || !location || !severityLevel) {
      return res.status(400).json({
        error: 'Round, description, location, and severity level are required',
      })
    }

    if (!images || !Array.isArray(images) || images.length === 0) {
      return res.status(400).json({ error: 'At least one image is required' })
    }

    if (images.length > 8) {
      return res
        .status(400)
        .json({ error: 'Maximum 8 images allowed per inspection' })
    }

    if (area && !VALID_AREAS.includes(area)) {
      return res.status(400).json({ error: 'Invalid area selected' })
    }

    if (!['Morning', 'Afternoon', 'Evening'].includes(round)) {
      return res.status(400).json({
        error: 'Invalid round. Must be Morning, Afternoon, or Evening',
      })
    }

    if (!['Low', 'Medium', 'High', 'Critical'].includes(severityLevel)) {
      return res.status(400).json({
        error: 'Invalid severity level. Must be Low, Medium, High, or Critical',
      })
    }

    if (description.length > 500) {
      return res
        .status(400)
        .json({ error: 'Description cannot exceed 500 characters' })
    }

    if (location.length > 100) {
      return res
        .status(400)
        .json({ error: 'Location cannot exceed 100 characters' })
    }

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
          imageUrls.push(imgData)
        }
      } catch (uploadError) {
        console.error('Inspection image upload failed:', uploadError)
        return res
          .status(500)
          .json({ error: 'Failed to upload one or more images' })
      }
    }

    if (horseId) {
      const horse = await prisma.horse.findUnique({ where: { id: horseId } })
      if (!horse) {
        return res.status(404).json({ error: 'Horse not found' })
      }
    }

    const inspection = await prisma.inspectionRound.create({
      data: {
        jamedarId: decoded.id,
        round,
        images: imageUrls,
        description: sanitizeString(description),
        horseId: horseId || null,
        location: sanitizeString(location),
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

    res.status(201).json({ inspection })
  } catch (error) {
    console.error('Error creating inspection:', error)
    res.status(500).json({ error: 'Failed to create inspection' })
  }
}

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '50mb',
    },
  },
}
