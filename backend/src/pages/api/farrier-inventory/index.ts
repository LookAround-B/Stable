import type { NextApiRequest, NextApiResponse } from 'next'
import {
  verifyToken,
  checkPermission,
  getTaskCapabilitiesForUser,
} from '@/lib/auth'
import prisma from '@/lib/prisma'
import { setCorsHeaders } from '@/lib/cors'
import { sanitizeString, isValidString, isValidId } from '@/lib/validate'

const AUTHORIZED_ROLES = [
  'Super Admin', 'Director', 'School Administrator',
  'Stable Manager', 'Farrier',
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

    const hasRoleAccess = AUTHORIZED_ROLES.includes(user.designation)
    const canManageInventory = await checkPermission(decoded, 'manageInventory')
    const taskCapabilities = await getTaskCapabilitiesForUser(
      decoded.id,
      decoded.designation
    )
    const canReadFarrierInventory =
      hasRoleAccess ||
      canManageInventory ||
      taskCapabilities.canReadFarrierInventory ||
      taskCapabilities.canWriteFarrierInventory
    const canWriteFarrierInventory =
      hasRoleAccess ||
      canManageInventory ||
      taskCapabilities.canWriteFarrierInventory

    switch (req.method) {
      case 'GET':
        if (!canReadFarrierInventory) return res.status(403).json({ error: 'Access denied' })
        return handleGet(req, res)
      case 'POST':
        if (!canWriteFarrierInventory) return res.status(403).json({ error: 'Access denied' })
        return handlePost(req, res, user.id)
      case 'PUT':
        if (!canWriteFarrierInventory) return res.status(403).json({ error: 'Access denied' })
        return handlePut(req, res)
      case 'DELETE':
        if (!canWriteFarrierInventory) return res.status(403).json({ error: 'Access denied' })
        return handleDelete(req, res, user)
      default: return res.status(405).json({ error: 'Method not allowed' })
    }
  } catch (error) {
    console.error('Farrier inventory API error:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}

const includeRelations = {
  horse: { select: { id: true, name: true, stableNumber: true } },
  farrier: { select: { id: true, fullName: true, designation: true } },
  createdBy: { select: { id: true, fullName: true, designation: true } },
}

async function handleGet(req: NextApiRequest, res: NextApiResponse) {
  const { category, horseId, search } = req.query
  const where: any = {}

  if (category) where.category = category as string
  if (horseId) where.horseId = horseId as string
  if (search) {
    where.OR = [
      { itemName: { contains: search as string, mode: 'insensitive' } },
      { supplier: { contains: search as string, mode: 'insensitive' } },
      { notes: { contains: search as string, mode: 'insensitive' } },
    ]
  }

  const records = await prisma.farrierInventory.findMany({
    where,
    include: includeRelations,
    orderBy: [{ category: 'asc' }, { itemName: 'asc' }],
  })

  return res.status(200).json(records)
}

async function handlePost(req: NextApiRequest, res: NextApiResponse, userId: string) {
  const {
    itemName, category, horseId, quantity, sizeType, material,
    condition, lastUsedDate, farrierId, serviceDate, nextServiceDue,
    notes, replacementCycle, costTracking, supplier,
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
  if (farrierId && !isValidId(farrierId)) {
    return res.status(400).json({ error: 'Invalid farrierId' })
  }
  if (quantity !== undefined) {
    const q = parseInt(quantity)
    if (isNaN(q) || q < 0 || q > 100000) {
      return res.status(400).json({ error: 'Quantity must be 0-100000' })
    }
  }
  if (costTracking !== undefined && costTracking !== null) {
    const c = parseFloat(costTracking)
    if (isNaN(c) || c < 0 || c > 10000000) {
      return res.status(400).json({ error: 'Cost must be 0-10000000' })
    }
  }
  if (notes && !isValidString(notes, 0, 1000)) {
    return res.status(400).json({ error: 'Notes must be max 1000 chars' })
  }
  if (supplier && !isValidString(supplier, 0, 200)) {
    return res.status(400).json({ error: 'Supplier must be max 200 chars' })
  }

  const record = await prisma.farrierInventory.create({
    data: {
      itemName: sanitizeString(itemName),
      category: sanitizeString(category),
      horseId: horseId || null,
      quantity: parseInt(quantity) || 0,
      sizeType: sizeType ? sanitizeString(sizeType) : null,
      material: material ? sanitizeString(material) : null,
      condition: condition || 'Good',
      lastUsedDate: lastUsedDate ? new Date(lastUsedDate) : null,
      farrierId: farrierId || null,
      serviceDate: serviceDate ? new Date(serviceDate) : null,
      nextServiceDue: nextServiceDue ? new Date(nextServiceDue) : null,
      notes: notes ? sanitizeString(notes) : null,
      replacementCycle: replacementCycle ? sanitizeString(replacementCycle) : null,
      costTracking: costTracking ? parseFloat(costTracking) : null,
      supplier: supplier ? sanitizeString(supplier) : null,
      createdById: userId,
    },
    include: includeRelations,
  })

  return res.status(201).json(record)
}

async function handlePut(req: NextApiRequest, res: NextApiResponse) {
  const {
    id, itemName, category, horseId, quantity, sizeType, material,
    condition, lastUsedDate, farrierId, serviceDate, nextServiceDue,
    notes, replacementCycle, costTracking, supplier,
  } = req.body

  if (!isValidId(id)) return res.status(400).json({ error: 'Valid ID is required' })

  const existing = await prisma.farrierInventory.findUnique({ where: { id } })
  if (!existing) return res.status(404).json({ error: 'Record not found' })

  const record = await prisma.farrierInventory.update({
    where: { id },
    data: {
      ...(itemName && { itemName: itemName.trim() }),
      ...(category && { category }),
      ...(horseId !== undefined && { horseId: horseId || null }),
      ...(quantity !== undefined && { quantity: parseInt(quantity) || 0 }),
      ...(sizeType !== undefined && { sizeType: sizeType || null }),
      ...(material !== undefined && { material: material || null }),
      ...(condition !== undefined && { condition: condition || 'Good' }),
      ...(lastUsedDate !== undefined && { lastUsedDate: lastUsedDate ? new Date(lastUsedDate) : null }),
      ...(farrierId !== undefined && { farrierId: farrierId || null }),
      ...(serviceDate !== undefined && { serviceDate: serviceDate ? new Date(serviceDate) : null }),
      ...(nextServiceDue !== undefined && { nextServiceDue: nextServiceDue ? new Date(nextServiceDue) : null }),
      ...(notes !== undefined && { notes: notes || null }),
      ...(replacementCycle !== undefined && { replacementCycle: replacementCycle || null }),
      ...(costTracking !== undefined && { costTracking: costTracking ? parseFloat(costTracking) : null }),
      ...(supplier !== undefined && { supplier: supplier || null }),
    },
    include: includeRelations,
  })

  return res.status(200).json(record)
}

async function handleDelete(req: NextApiRequest, res: NextApiResponse, user: any) {
  const { id } = req.body
  if (!isValidId(id)) return res.status(400).json({ error: 'Valid ID is required' })

  const record = await prisma.farrierInventory.findUnique({ where: { id } })
  if (!record) return res.status(404).json({ error: 'Record not found' })

  if (record.createdById !== user.id && !['Super Admin', 'Director'].includes(user.designation)) {
    return res.status(403).json({ error: 'Permission denied' })
  }

  await prisma.farrierInventory.delete({ where: { id } })
  return res.status(200).json({ message: 'Deleted successfully' })
}
