import type { NextApiRequest, NextApiResponse } from 'next'
import { getTokenFromRequest, verifyToken } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { runMiddleware } from '@/lib/cors'
import cors from 'cors'

const corsMiddleware = cors({
  origin: ['http://localhost:3001', 'http://localhost:3002', 'http://localhost:3000'],
  credentials: true,
})

async function handleGetFine(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { id } = req.query
    const token = getTokenFromRequest(req as any)
    const decoded = verifyToken(token)
    const userId = decoded?.id

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    const fine = await prisma.fine.findUnique({
      where: { id: id as string },
      include: {
        issuedBy: {
          select: { id: true, fullName: true, designation: true, email: true },
        },
        issuedTo: {
          select: { id: true, fullName: true, designation: true, email: true },
        },
        resolvedBy: {
          select: { id: true, fullName: true, designation: true, email: true },
        },
      },
    })

    if (!fine) {
      return res.status(404).json({ error: 'Fine not found' })
    }

    res.status(200).json({ fine })
  } catch (error) {
    console.error('❌ Error fetching fine:', error)
    res.status(500).json({ error: 'Failed to fetch fine' })
  }
}

async function handleUpdateFine(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { id } = req.query
    const { status, resolutionNotes } = req.body
    const token = getTokenFromRequest(req as any)
    const decoded = verifyToken(token)
    const userId = decoded?.id
    const userDesignation = decoded?.role

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    // Check if fine exists
    const fine = await prisma.fine.findUnique({
      where: { id: id as string },
    })

    if (!fine) {
      return res.status(404).json({ error: 'Fine not found' })
    }

    // Check authorization (must be issuer or director/admin)
    if (userId !== fine.issuedById && !['Super Admin', 'Director', 'School Administrator', 'Stable Manager'].includes(userDesignation)) {
      return res.status(403).json({ error: 'Not authorized to update this fine' })
    }

    // Validation
    if (status && !['Open', 'Resolved', 'Dismissed'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status. Must be Open, Resolved, or Dismissed' })
    }

    if (resolutionNotes && resolutionNotes.length > 500) {
      return res.status(400).json({ error: 'Resolution notes cannot exceed 500 characters' })
    }

    // If status is changing to Resolved or Dismissed, set resolvedBy
    const updateData: any = { status }
    if (status && status !== 'Open') {
      updateData.resolvedById = userId
      updateData.resolutionNotes = resolutionNotes || ''
    }

    // Update fine
    const updatedFine = await prisma.fine.update({
      where: { id: id as string },
      data: updateData,
      include: {
        issuedBy: {
          select: { id: true, fullName: true, designation: true, email: true },
        },
        issuedTo: {
          select: { id: true, fullName: true, designation: true, email: true },
        },
        resolvedBy: {
          select: { id: true, fullName: true, designation: true, email: true },
        },
      },
    })

    console.log('✅ Fine updated:', updatedFine.id)
    res.status(200).json({ fine: updatedFine })
  } catch (error) {
    console.error('❌ Error updating fine:', error)
    res.status(500).json({ error: 'Failed to update fine' })
  }
}

async function handleDeleteFine(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { id } = req.query
    const token = getTokenFromRequest(req as any)
    const decoded = verifyToken(token)
    const userId = decoded?.id
    const userDesignation = decoded?.role

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    // Check if fine exists
    const fine = await prisma.fine.findUnique({
      where: { id: id as string },
    })

    if (!fine) {
      return res.status(404).json({ error: 'Fine not found' })
    }

    // Check authorization (only issuer or director/admin can delete)
    if (userId !== fine.issuedById && !['Super Admin', 'Director', 'School Administrator'].includes(userDesignation)) {
      return res.status(403).json({ error: 'Not authorized to delete this fine' })
    }

    // Delete fine
    await prisma.fine.delete({
      where: { id: id as string },
    })

    console.log('✅ Fine deleted:', id)
    res.status(200).json({ message: 'Fine deleted successfully' })
  } catch (error) {
    console.error('❌ Error deleting fine:', error)
    res.status(500).json({ error: 'Failed to delete fine' })
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
      return handleGetFine(req, res)
    case 'PUT':
      return handleUpdateFine(req, res)
    case 'DELETE':
      return handleDeleteFine(req, res)
    default:
      return res.status(405).json({ error: 'Method not allowed' })
  }
}
