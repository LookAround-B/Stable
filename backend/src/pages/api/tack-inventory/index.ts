import type { NextApiRequest, NextApiResponse } from 'next'
import { verifyToken, checkPermission } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { setCorsHeaders } from '@/lib/cors'
import { sanitizeString, isValidString, isValidId } from '@/lib/validate'

const AUTHORIZED_ROLES = [
  'Super Admin', 'Director', 'School Administrator',
  'Stable Manager', 'Instructor', 'Ground Supervisor',
]

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const origin = req.headers.origin
  setCorsHeaders(res, origin as string | undefined)

  if (req.method === 'OPTIONS') return res.status(200).end()

  try {
    const token = req.headers.authorization?.split(' ')[1]
    if (!token) return res.status(401).json({ error: 'Unauthorized' })

    const decoded = verifyToken(token)
    if (!decoded) return res.status(401).json({ error: 'Invalid or expired token' })

    const user = await prisma.employee.findUnique({
      where: { id: decoded.id },
      select: { id: true, designation: true, fullName: true },
    })
    if (!user) return res.status(401).json({ error: 'User not found' })

    if (!AUTHORIZED_ROLES.includes(user.designation)) {
      const allowed = await checkPermission(decoded, 'manageInventory')
      if (!allowed) return res.status(403).json({ error: 'Access denied' })
    }

    switch (req.method) {
      case 'GET': return handleGet(req, res)
      case 'POST': return handlePost(req, res, user.id)
      case 'PUT': return handlePut(req, res)
      case 'DELETE': return handleDelete(req, res, user)
      default: return res.status(405).json({ error: 'Method not allowed' })
    }
  } catch (error) {
    console.error('Tack inventory API error:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}

const includeRelations = {
  horse: { select: { id: true, name: true } },
  rider: { select: { id: true, fullName: true, designation: true } },
  createdBy: { select: { id: true, fullName: true, designation: true } },
}

async function handleGet(req: NextApiRequest, res: NextApiResponse) {
  const { category, condition, search, horseId } = req.query
  const where: any = {}

  if (category) where.category = category as string
  if (condition) where.condition = condition as string
  if (horseId) where.horseId = horseId as string
  if (search) {
    where.OR = [
      { itemName: { contains: search as string, mode: 'insensitive' } },
      { brand: { contains: search as string, mode: 'insensitive' } },
      { storageLocation: { contains: search as string, mode: 'insensitive' } },
    ]
  }

  const records = await prisma.tackInventory.findMany({
    where,
    include: includeRelations,
    orderBy: [{ category: 'asc' }, { itemName: 'asc' }],
  })

  return res.status(200).json(records)
}

async function handlePost(req: NextApiRequest, res: NextApiResponse, userId: string) {
  const {
    itemName, category, horseId, riderId, quantity, condition,
    brand, size, material, purchaseDate, lastUsedDate,
    maintenanceRequired, notes, cleaningSchedule, repairHistory, storageLocation,
  } = req.body

  if (!isValidString(itemName, 1, 200)) {
    return res.status(400).json({ error: 'Item name is required (max 200 chars)' })
  }
  if (!isValidString(category, 1, 100)) {
    return res.status(400).json({ error: 'Category is required (max 100 chars)' })
  }
  if (horseId && !isValidId(horseId)) {
    return res.status(400).json({ error: 'Invalid horseId' })
  }
  if (riderId && !isValidId(riderId)) {
    return res.status(400).json({ error: 'Invalid riderId' })
  }
  if (notes && !isValidString(notes, 0, 1000)) {
    return res.status(400).json({ error: 'Notes must be max 1000 chars' })
  }
  if (brand && !isValidString(brand, 0, 100)) {
    return res.status(400).json({ error: 'Brand must be max 100 chars' })
  }
  if (storageLocation && !isValidString(storageLocation, 0, 200)) {
    return res.status(400).json({ error: 'Storage location must be max 200 chars' })
  }

  const record = await prisma.tackInventory.create({
    data: {
      itemName: sanitizeString(itemName),
      category: sanitizeString(category),
      horseId: horseId || null,
      riderId: riderId || null,
      quantity: parseInt(quantity) || 1,
      condition: condition || 'Good',
      brand: brand ? sanitizeString(brand) : null,
      size: size ? sanitizeString(size) : null,
      material: material ? sanitizeString(material) : null,
      purchaseDate: purchaseDate ? new Date(purchaseDate) : null,
      lastUsedDate: lastUsedDate ? new Date(lastUsedDate) : null,
      maintenanceRequired: Boolean(maintenanceRequired),
      notes: notes ? sanitizeString(notes) : null,
      cleaningSchedule: cleaningSchedule ? sanitizeString(cleaningSchedule) : null,
      repairHistory: repairHistory ? sanitizeString(repairHistory) : null,
      storageLocation: storageLocation ? sanitizeString(storageLocation) : null,
      createdById: userId,
    },
    include: includeRelations,
  })

  return res.status(201).json(record)
}

async function handlePut(req: NextApiRequest, res: NextApiResponse) {
  const {
    id, itemName, category, horseId, riderId, quantity, condition,
    brand, size, material, purchaseDate, lastUsedDate,
    maintenanceRequired, notes, cleaningSchedule, repairHistory, storageLocation,
  } = req.body

  if (!isValidId(id)) return res.status(400).json({ error: 'Valid ID is required' })

  const existing = await prisma.tackInventory.findUnique({ where: { id } })
  if (!existing) return res.status(404).json({ error: 'Record not found' })

  const record = await prisma.tackInventory.update({
    where: { id },
    data: {
      ...(itemName && { itemName: sanitizeString(itemName) }),
      ...(category && { category }),
      ...(horseId !== undefined && { horseId: horseId || null }),
      ...(riderId !== undefined && { riderId: riderId || null }),
      ...(quantity !== undefined && { quantity: parseInt(quantity) || 1 }),
      ...(condition && { condition }),
      ...(brand !== undefined && { brand: brand || null }),
      ...(size !== undefined && { size: size || null }),
      ...(material !== undefined && { material: material || null }),
      ...(purchaseDate !== undefined && { purchaseDate: purchaseDate ? new Date(purchaseDate) : null }),
      ...(lastUsedDate !== undefined && { lastUsedDate: lastUsedDate ? new Date(lastUsedDate) : null }),
      ...(maintenanceRequired !== undefined && { maintenanceRequired: Boolean(maintenanceRequired) }),
      ...(notes !== undefined && { notes: notes || null }),
      ...(cleaningSchedule !== undefined && { cleaningSchedule: cleaningSchedule || null }),
      ...(repairHistory !== undefined && { repairHistory: repairHistory || null }),
      ...(storageLocation !== undefined && { storageLocation: storageLocation || null }),
    },
    include: includeRelations,
  })

  return res.status(200).json(record)
}

async function handleDelete(req: NextApiRequest, res: NextApiResponse, user: any) {
  const { id } = req.body
  if (!isValidId(id)) return res.status(400).json({ error: 'Valid ID is required' })

  const record = await prisma.tackInventory.findUnique({ where: { id } })
  if (!record) return res.status(404).json({ error: 'Record not found' })

  if (record.createdById !== user.id && !['Super Admin', 'Director'].includes(user.designation)) {
    return res.status(403).json({ error: 'Permission denied' })
  }

  await prisma.tackInventory.delete({ where: { id } })
  return res.status(200).json({ message: 'Deleted successfully' })
}
