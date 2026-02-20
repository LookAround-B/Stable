import type { NextApiRequest, NextApiResponse } from 'next'
import { getTokenFromRequest, verifyToken } from '@/lib/auth'
import prisma from '@/lib/prisma'
async function handleGetInspection(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { id } = req.query
    const token = getTokenFromRequest(req as any)
    if (!token) {
      return res.status(401).json({ error: 'Unauthorized' })
    }
    const decoded = verifyToken(token)
    const userId = decoded?.id

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    const inspection = await prisma.inspectionRound.findUnique({
      where: { id: id as string },
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

    res.status(200).json({ inspection })
  } catch (error) {
    console.error('❌ Error fetching inspection:', error)
    res.status(500).json({ error: 'Failed to fetch inspection' })
  }
}

async function handleUpdateInspection(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { id } = req.query
    const { round, description, horseId, location, severityLevel, comments, status, resolutionNotes } = req.body
    const token = getTokenFromRequest(req as any)
    if (!token) {
      return res.status(401).json({ error: 'Unauthorized' })
    }
    const decoded = verifyToken(token)
    const userId = decoded?.id
    const userRole = decoded?.designation

    if (!userId || !userRole) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    // Check if inspection exists
    const inspection = await prisma.inspectionRound.findUnique({
      where: { id: id as string },
    })

    if (!inspection) {
      return res.status(404).json({ error: 'Inspection not found' })
    }

    // Check authorization (creator or manager)
    const AUTHORIZED_ROLES = ['Super Admin', 'Director', 'School Administrator', 'Stable Manager', 'Jamedar']
    if (userId !== inspection.jamedarId && !AUTHORIZED_ROLES.includes(userRole)) {
      return res.status(403).json({ error: 'Not authorized to update this inspection' })
    }

    // Validation
    if (round && !['Morning', 'Afternoon', 'Evening'].includes(round)) {
      return res.status(400).json({ error: 'Invalid round. Must be Morning, Afternoon, or Evening' })
    }

    if (severityLevel && !['Low', 'Medium', 'High', 'Critical'].includes(severityLevel)) {
      return res.status(400).json({ error: 'Invalid severity level. Must be Low, Medium, High, or Critical' })
    }

    if (description && description.length > 500) {
      return res.status(400).json({ error: 'Description cannot exceed 500 characters' })
    }

    if (location && location.length > 100) {
      return res.status(400).json({ error: 'Location cannot exceed 100 characters' })
    }

    if (comments && comments.length > 500) {
      return res.status(400).json({ error: 'Comments cannot exceed 500 characters' })
    }

    if (resolutionNotes && resolutionNotes.length > 500) {
      return res.status(400).json({ error: 'Resolution notes cannot exceed 500 characters' })
    }

    if (status && !['Open', 'Resolved'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status. Must be Open or Resolved' })
    }

    // Validate horse exists if provided
    if (horseId) {
      const horse = await prisma.horse.findUnique({ where: { id: horseId } })
      if (!horse) {
        return res.status(404).json({ error: 'Horse not found' })
      }
    }

    // Build update data
    const updateData: any = {
      ...(round && { round }),
      ...(description && { description }),
      ...(horseId !== undefined && { horseId: horseId || null }),
      ...(location && { location }),
      ...(severityLevel && { severityLevel }),
      ...(comments !== undefined && { comments: comments || null }),
    }

    // Handle resolution
    if (status) {
      updateData.status = status
      if (status === 'Resolved') {
        updateData.resolvedById = userId
        updateData.resolvedAt = new Date()
        updateData.resolutionNotes = resolutionNotes || null
      } else if (status === 'Open') {
        updateData.resolvedById = null
        updateData.resolvedAt = null
        updateData.resolutionNotes = null
      }
    }

    // Update inspection
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

    console.log('✅ Inspection updated:', updatedInspection.id)
    res.status(200).json({ inspection: updatedInspection })
  } catch (error) {
    console.error('❌ Error updating inspection:', error)
    res.status(500).json({ error: 'Failed to update inspection' })
  }
}

async function handleDeleteInspection(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { id } = req.query
    const token = getTokenFromRequest(req as any)
    if (!token) {
      return res.status(401).json({ error: 'Unauthorized' })
    }
    const decoded = verifyToken(token)
    const userId = decoded?.id
    const userDesignation = decoded?.designation

    if (!userId || !userDesignation) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    // Check if inspection exists
    const inspection = await prisma.inspectionRound.findUnique({
      where: { id: id as string },
    })

    if (!inspection) {
      return res.status(404).json({ error: 'Inspection not found' })
    }

    // Check authorization (creator or manager)
    if (userId !== inspection.jamedarId && !['Stable Manager', 'School Administrator', 'Director'].includes(userDesignation)) {
      return res.status(403).json({ error: 'Not authorized to delete this inspection' })
    }

    // Delete inspection
    await prisma.inspectionRound.delete({
      where: { id: id as string },
    })

    console.log('✅ Inspection deleted:', id)
    res.status(200).json({ message: 'Inspection deleted successfully' })
  } catch (error) {
    console.error('❌ Error deleting inspection:', error)
    res.status(500).json({ error: 'Failed to delete inspection' })
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Check authentication
  const token = getTokenFromRequest(req as any)
  if (!token || !verifyToken(token)) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  switch (req.method) {
    case 'GET':
      return handleGetInspection(req, res)
    case 'PUT':
      return handleUpdateInspection(req, res)
    case 'DELETE':
      return handleDeleteInspection(req, res)
    default:
      return res.status(405).json({ error: 'Method not allowed' })
  }
}
