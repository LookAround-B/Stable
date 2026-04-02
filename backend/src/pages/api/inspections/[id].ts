import type { NextApiRequest, NextApiResponse } from 'next'
import {
  checkPermission,
  getTaskCapabilitiesForUser,
  getTokenFromRequest,
  verifyToken,
} from '@/lib/auth'
import prisma from '@/lib/prisma'
import { setCorsHeaders } from '@/lib/cors'
import { isValidId, sanitizeString } from '@/lib/validate'

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
      return handleGetInspection(req, res, decoded)
    case 'PUT':
      return handleUpdateInspection(req, res, decoded)
    case 'DELETE':
      return handleDeleteInspection(req, res, decoded)
    default:
      return res.status(405).json({ error: 'Method not allowed' })
  }
}

async function handleGetInspection(
  req: NextApiRequest,
  res: NextApiResponse,
  decoded: { id: string; designation: string; email: string }
) {
  try {
    const { id } = req.query
    if (!id || typeof id !== 'string' || !isValidId(id)) {
      return res.status(400).json({ error: 'Invalid inspection ID' })
    }

    const inspection = await prisma.inspectionRound.findUnique({
      where: { id },
      include: {
        jamedar: {
          select: { id: true, fullName: true, designation: true, email: true },
        },
        horse: {
          select: { id: true, name: true },
        },
        resolvedBy: {
          select: { id: true, fullName: true, designation: true, email: true },
        },
      },
    })

    if (!inspection) {
      return res.status(404).json({ error: 'Inspection not found' })
    }

    const canManageSchedules = await checkPermission(decoded, 'manageSchedules')
    const taskCapabilities = await getTaskCapabilitiesForUser(
      decoded.id,
      decoded.designation
    )
    const canViewAll =
      canManageSchedules || taskCapabilities.canViewAllInspections
    const canViewOwn = taskCapabilities.canCreateInspections

    if (
      !canViewAll &&
      (!canViewOwn || inspection.jamedarId !== decoded.id)
    ) {
      return res.status(403).json({ error: 'Not authorized to view this inspection' })
    }

    res.status(200).json({ inspection })
  } catch (error) {
    console.error('Error fetching inspection:', error)
    res.status(500).json({ error: 'Failed to fetch inspection' })
  }
}

async function handleUpdateInspection(
  req: NextApiRequest,
  res: NextApiResponse,
  decoded: { id: string; designation: string; email: string }
) {
  try {
    const { id } = req.query
    const {
      round,
      description,
      horseId,
      location,
      area,
      severityLevel,
      comments,
      status,
      resolutionNotes,
      images,
    } = req.body

    const inspection = await prisma.inspectionRound.findUnique({
      where: { id: id as string },
    })

    if (!inspection) {
      return res.status(404).json({ error: 'Inspection not found' })
    }

    const canManageSchedules = await checkPermission(decoded, 'manageSchedules')
    const taskCapabilities = await getTaskCapabilitiesForUser(
      decoded.id,
      decoded.designation
    )
    const canResolve =
      canManageSchedules || taskCapabilities.canResolveInspections
    const canEditOwn =
      taskCapabilities.canCreateInspections && inspection.jamedarId === decoded.id

    if (!canResolve && !canEditOwn) {
      return res.status(403).json({ error: 'Not authorized to update this inspection' })
    }

    if (round && !['Morning', 'Afternoon', 'Evening'].includes(round)) {
      return res.status(400).json({
        error: 'Invalid round. Must be Morning, Afternoon, or Evening',
      })
    }

    if (
      severityLevel &&
      !['Low', 'Medium', 'High', 'Critical'].includes(severityLevel)
    ) {
      return res.status(400).json({
        error: 'Invalid severity level. Must be Low, Medium, High, or Critical',
      })
    }

    if (area && !VALID_AREAS.includes(area)) {
      return res.status(400).json({ error: 'Invalid area selected' })
    }

    if (description && description.length > 500) {
      return res
        .status(400)
        .json({ error: 'Description cannot exceed 500 characters' })
    }

    if (location && location.length > 100) {
      return res
        .status(400)
        .json({ error: 'Location cannot exceed 100 characters' })
    }

    if (comments && comments.length > 500) {
      return res
        .status(400)
        .json({ error: 'Comments cannot exceed 500 characters' })
    }

    if (resolutionNotes && resolutionNotes.length > 500) {
      return res
        .status(400)
        .json({ error: 'Resolution notes cannot exceed 500 characters' })
    }

    if (status && !['Open', 'Resolved'].includes(status)) {
      return res
        .status(400)
        .json({ error: 'Invalid status. Must be Open or Resolved' })
    }

    if ((status || comments !== undefined || resolutionNotes !== undefined) && !canResolve) {
      return res.status(403).json({
        error: 'Inspection resolution is not enabled for your account.',
      })
    }

    if (horseId) {
      const horse = await prisma.horse.findUnique({ where: { id: horseId } })
      if (!horse) {
        return res.status(404).json({ error: 'Horse not found' })
      }
    }

    const updateData: any = {
      ...(round && { round }),
      ...(description && { description: sanitizeString(description) }),
      ...(horseId !== undefined && { horseId: horseId || null }),
      ...(location && { location: sanitizeString(location) }),
      ...(area !== undefined && { area: area || null }),
      ...(severityLevel && { severityLevel }),
    }

    if (canResolve) {
      updateData.comments =
        comments !== undefined ? (comments ? sanitizeString(comments) : null) : inspection.comments
    }

    if (images && Array.isArray(images) && images.length > 0) {
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
        } catch (e) {
          console.error('Inspection image upload failed during update:', e)
        }
      }

      if (imageUrls.length > 0) {
        updateData.images = imageUrls
      }
    }

    if (status && canResolve) {
      updateData.status = status
      if (status === 'Resolved') {
        updateData.resolvedById = decoded.id
        updateData.resolvedAt = new Date()
        updateData.resolutionNotes = resolutionNotes
          ? sanitizeString(resolutionNotes)
          : null
      } else {
        updateData.resolvedById = null
        updateData.resolvedAt = null
        updateData.resolutionNotes = null
      }
    }

    const updatedInspection = await prisma.inspectionRound.update({
      where: { id: id as string },
      data: updateData,
      include: {
        jamedar: {
          select: { id: true, fullName: true, designation: true, email: true },
        },
        horse: {
          select: { id: true, name: true },
        },
        resolvedBy: {
          select: { id: true, fullName: true, designation: true, email: true },
        },
      },
    })

    res.status(200).json({ inspection: updatedInspection })
  } catch (error) {
    console.error('Error updating inspection:', error)
    res.status(500).json({ error: 'Failed to update inspection' })
  }
}

async function handleDeleteInspection(
  req: NextApiRequest,
  res: NextApiResponse,
  decoded: { id: string; designation: string; email: string }
) {
  try {
    const { id } = req.query
    const inspection = await prisma.inspectionRound.findUnique({
      where: { id: id as string },
    })

    if (!inspection) {
      return res.status(404).json({ error: 'Inspection not found' })
    }

    const canManageSchedules = await checkPermission(decoded, 'manageSchedules')
    const taskCapabilities = await getTaskCapabilitiesForUser(
      decoded.id,
      decoded.designation
    )
    const canResolve =
      canManageSchedules || taskCapabilities.canResolveInspections
    const canDeleteOwn =
      taskCapabilities.canCreateInspections && inspection.jamedarId === decoded.id

    if (!canResolve && !canDeleteOwn) {
      return res.status(403).json({ error: 'Not authorized to delete this inspection' })
    }

    await prisma.inspectionRound.delete({
      where: { id: id as string },
    })

    res.status(200).json({ message: 'Inspection deleted successfully' })
  } catch (error) {
    console.error('Error deleting inspection:', error)
    res.status(500).json({ error: 'Failed to delete inspection' })
  }
}

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '50mb',
    },
  },
}
