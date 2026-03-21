import type { NextApiRequest, NextApiResponse } from 'next'
import { verifyToken, checkPermission } from '@/lib/auth'
import prisma from '@/lib/prisma'

const AUTHORIZED_ROLES = [
  'Super Admin', 'Director', 'School Administrator',
  'Stable Manager', 'Farrier',
]

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  res.setHeader('Access-Control-Allow-Credentials', 'true')

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

  if (!itemName || !category) {
    return res.status(400).json({ error: 'Item name and category are required' })
  }

  const record = await prisma.farrierInventory.create({
    data: {
      itemName: itemName.trim(),
      category,
      horseId: horseId || null,
      quantity: parseInt(quantity) || 0,
      sizeType: sizeType || null,
      material: material || null,
      condition: condition || 'Good',
      lastUsedDate: lastUsedDate ? new Date(lastUsedDate) : null,
      farrierId: farrierId || null,
      serviceDate: serviceDate ? new Date(serviceDate) : null,
      nextServiceDue: nextServiceDue ? new Date(nextServiceDue) : null,
      notes: notes || null,
      replacementCycle: replacementCycle || null,
      costTracking: costTracking ? parseFloat(costTracking) : null,
      supplier: supplier || null,
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

  if (!id) return res.status(400).json({ error: 'ID is required' })

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
  if (!id) return res.status(400).json({ error: 'ID is required' })

  const record = await prisma.farrierInventory.findUnique({ where: { id } })
  if (!record) return res.status(404).json({ error: 'Record not found' })

  if (record.createdById !== user.id && !['Super Admin', 'Director'].includes(user.designation)) {
    return res.status(403).json({ error: 'Permission denied' })
  }

  await prisma.farrierInventory.delete({ where: { id } })
  return res.status(200).json({ message: 'Deleted successfully' })
}
