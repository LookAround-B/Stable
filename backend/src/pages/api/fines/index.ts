import type { NextApiRequest, NextApiResponse } from 'next'
import { getTokenFromRequest, verifyToken } from '@/lib/auth'

import prisma from '@/lib/prisma'

const AUTHORIZED_ROLES = ['Super Admin', 'Director', 'School Administrator', 'Stable Manager', 'Jamedar']

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
      return handleRoutes(req, res)
    case 'POST':
      return handleCreateFine(req, res)
    default:
      return res.status(405).json({ error: 'Method not allowed' })
  }
}

async function handleRoutes(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { status, issuedToId, issuedById, startDate, endDate } = req.query
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

    const where: any = {}

    if (status) where.status = status
    if (issuedToId) where.issuedToId = issuedToId
    if (issuedById) where.issuedById = issuedById

    if (startDate || endDate) {
      where.createdAt = {}
      if (startDate) where.createdAt.gte = new Date(startDate as string)
      if (endDate) {
        const end = new Date(endDate as string)
        end.setHours(23, 59, 59, 999)
        where.createdAt.lte = end
      }
    }

    // Role-based filtering
    // Users can always see fines issued TO them
    // Jamedar see fines they issued OR fines issued to them
    // Admin roles see all fines
    if (userDesignation === 'Jamedar') {
      where.OR = [
        { issuedById: userId },
        { issuedToId: userId },
      ]
    } else if (!['Super Admin', 'Director', 'School Administrator', 'Stable Manager'].includes(userDesignation)) {
      // Non-admin users can only see fines issued to them
      where.issuedToId = userId
    }
    // Admin roles see all - no filter applied

    const fines = await prisma.fine.findMany({
      where,
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
      orderBy: { createdAt: 'desc' },
    })

    res.status(200).json({ fines })
  } catch (error) {
    console.error('❌ Error fetching fines:', error)
    res.status(500).json({ error: 'Failed to fetch fines' })
  }
}

async function handleCreateFine(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { issuedToId, reason, evidenceImage } = req.body
    const token = getTokenFromRequest(req as any)
    if (!token) {
      return res.status(401).json({ error: 'Unauthorized' })
    }
    const decoded = verifyToken(token)
    const issuedById = decoded?.id
    const userDesignation = decoded?.designation

    if (!issuedById || !userDesignation) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    // Check if user is authorized to issue fines (Jamedar, Stable Manager, School Admin, Director, Super Admin)
    if (!AUTHORIZED_ROLES.includes(userDesignation)) {
      return res.status(403).json({ error: 'Your role is not authorized to issue fines' })
    }

    // Validation
    if (!issuedToId || !reason || !evidenceImage) {
      return res.status(400).json({
        error: 'Issued to, reason, and evidence image are required',
      })
    }

    if (reason.length > 500) {
      return res.status(400).json({ error: 'Reason cannot exceed 500 characters' })
    }

    // Check if employee exists
    const employee = await prisma.employee.findUnique({
      where: { id: issuedToId },
    })

    if (!employee) {
      return res.status(404).json({ error: 'Employee not found' })
    }

    // Handle image upload
    let imageUrl = evidenceImage
    const { uploadImage } = await import('@/lib/s3')

    if (evidenceImage && typeof evidenceImage === 'object' && evidenceImage.data) {
      console.log('[Object] File upload:', evidenceImage.name)
      try {
        const buffer = Buffer.from(evidenceImage.data, 'base64')
        imageUrl = await uploadImage(buffer, evidenceImage.name, evidenceImage.type, 'fines')
        console.log('✅ Image uploaded:', imageUrl)
      } catch (uploadError) {
        console.error('❌ Image upload failed:', uploadError)
        return res.status(500).json({ error: 'Failed to upload image' })
      }
    } else if (evidenceImage && typeof evidenceImage === 'string' && evidenceImage.startsWith('data:')) {
      console.log('[String] Data URL format')
      try {
        const [header, ...dataParts] = evidenceImage.split(',')
        const mimeType = header.match(/:(.*?);/)?.[1] || 'image/jpeg'
        const buffer = Buffer.from(dataParts.join(','), 'base64')
        const timestamp = Date.now()
        const filename = `${timestamp}-fine.${mimeType.split('/')[1]}`
        imageUrl = await uploadImage(buffer, filename, mimeType, 'fines')
        console.log('✅ Image uploaded:', imageUrl)
      } catch (uploadError) {
        console.error('❌ Image upload failed:', uploadError)
        return res.status(500).json({ error: 'Failed to upload image' })
      }
    }

    // Create fine
    const fine = await prisma.fine.create({
      data: {
        issuedById,
        issuedToId,
        reason,
        evidenceImage: imageUrl,
        status: 'Open',
      },
      include: {
        issuedBy: {
          select: { id: true, fullName: true, designation: true, email: true },
        },
        issuedTo: {
          select: { id: true, fullName: true, designation: true, email: true },
        },
      },
    })

    console.log('✅ Fine created:', fine.id)
    res.status(201).json({ fine })
  } catch (error) {
    console.error('❌ Error creating fine:', error)
    res.status(500).json({ error: 'Failed to create fine' })
  }
}


