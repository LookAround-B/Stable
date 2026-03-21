import type { NextApiRequest, NextApiResponse } from 'next'
import { verifyToken, checkPermission } from '@/lib/auth'
import prisma from '@/lib/prisma'

const AUTHORIZED_ROLES = [
  'Super Admin', 'Director', 'School Administrator',
  'Stable Manager', 'Ground Supervisor', 'Housekeeping',
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
    console.error('Housekeeping inventory API error:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}

const includeRelations = {
  assignedStaff: { select: { id: true, fullName: true, designation: true } },
  createdBy: { select: { id: true, fullName: true, designation: true } },
}

async function handleGet(req: NextApiRequest, res: NextApiResponse) {
  const { category, usageArea, search } = req.query
  const where: any = {}

  if (category) where.category = category as string
  if (usageArea) where.usageArea = usageArea as string
  if (search) {
    where.OR = [
      { itemName: { contains: search as string, mode: 'insensitive' } },
      { supplierName: { contains: search as string, mode: 'insensitive' } },
      { storageLocation: { contains: search as string, mode: 'insensitive' } },
    ]
  }

  const records = await prisma.housekeepingInventory.findMany({
    where,
    include: includeRelations,
    orderBy: [{ category: 'asc' }, { itemName: 'asc' }],
  })

  return res.status(200).json(records)
}

async function handlePost(req: NextApiRequest, res: NextApiResponse, userId: string) {
  const {
    itemName, category, quantity, unitType, minimumStockLevel,
    reorderAlert, storageLocation, supplierName, purchaseDate, expiryDate,
    usageArea, consumptionRate, lastRestockedDate, assignedStaffId, costPerUnit, notes,
  } = req.body

  if (!itemName || !category) {
    return res.status(400).json({ error: 'Item name and category are required' })
  }

  const record = await prisma.housekeepingInventory.create({
    data: {
      itemName: itemName.trim(),
      category,
      quantity: parseFloat(quantity) || 0,
      unitType: unitType || 'pcs',
      minimumStockLevel: minimumStockLevel ? parseFloat(minimumStockLevel) : null,
      reorderAlert: Boolean(reorderAlert),
      storageLocation: storageLocation || null,
      supplierName: supplierName || null,
      purchaseDate: purchaseDate ? new Date(purchaseDate) : null,
      expiryDate: expiryDate ? new Date(expiryDate) : null,
      usageArea: usageArea || null,
      consumptionRate: consumptionRate || null,
      lastRestockedDate: lastRestockedDate ? new Date(lastRestockedDate) : null,
      assignedStaffId: assignedStaffId || null,
      costPerUnit: costPerUnit ? parseFloat(costPerUnit) : null,
      notes: notes || null,
      createdById: userId,
    },
    include: includeRelations,
  })

  return res.status(201).json(record)
}

async function handlePut(req: NextApiRequest, res: NextApiResponse) {
  const {
    id, itemName, category, quantity, unitType, minimumStockLevel,
    reorderAlert, storageLocation, supplierName, purchaseDate, expiryDate,
    usageArea, consumptionRate, lastRestockedDate, assignedStaffId, costPerUnit, notes,
  } = req.body

  if (!id) return res.status(400).json({ error: 'ID is required' })

  const existing = await prisma.housekeepingInventory.findUnique({ where: { id } })
  if (!existing) return res.status(404).json({ error: 'Record not found' })

  const record = await prisma.housekeepingInventory.update({
    where: { id },
    data: {
      ...(itemName && { itemName: itemName.trim() }),
      ...(category && { category }),
      ...(quantity !== undefined && { quantity: parseFloat(quantity) || 0 }),
      ...(unitType && { unitType }),
      ...(minimumStockLevel !== undefined && { minimumStockLevel: minimumStockLevel ? parseFloat(minimumStockLevel) : null }),
      ...(reorderAlert !== undefined && { reorderAlert: Boolean(reorderAlert) }),
      ...(storageLocation !== undefined && { storageLocation: storageLocation || null }),
      ...(supplierName !== undefined && { supplierName: supplierName || null }),
      ...(purchaseDate !== undefined && { purchaseDate: purchaseDate ? new Date(purchaseDate) : null }),
      ...(expiryDate !== undefined && { expiryDate: expiryDate ? new Date(expiryDate) : null }),
      ...(usageArea !== undefined && { usageArea: usageArea || null }),
      ...(consumptionRate !== undefined && { consumptionRate: consumptionRate || null }),
      ...(lastRestockedDate !== undefined && { lastRestockedDate: lastRestockedDate ? new Date(lastRestockedDate) : null }),
      ...(assignedStaffId !== undefined && { assignedStaffId: assignedStaffId || null }),
      ...(costPerUnit !== undefined && { costPerUnit: costPerUnit ? parseFloat(costPerUnit) : null }),
      ...(notes !== undefined && { notes: notes || null }),
    },
    include: includeRelations,
  })

  return res.status(200).json(record)
}

async function handleDelete(req: NextApiRequest, res: NextApiResponse, user: any) {
  const { id } = req.body
  if (!id) return res.status(400).json({ error: 'ID is required' })

  const record = await prisma.housekeepingInventory.findUnique({ where: { id } })
  if (!record) return res.status(404).json({ error: 'Record not found' })

  if (record.createdById !== user.id && !['Super Admin', 'Director'].includes(user.designation)) {
    return res.status(403).json({ error: 'Permission denied' })
  }

  await prisma.housekeepingInventory.delete({ where: { id } })
  return res.status(200).json({ message: 'Deleted successfully' })
}
