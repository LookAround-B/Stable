import type { NextApiRequest, NextApiResponse } from 'next'
import { verifyToken, checkPermission } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { setCorsHeaders } from '@/lib/cors'
import { sanitizeString, isValidString, isValidId } from '@/lib/validate'

const AUTHORIZED_ROLES = [
  'Super Admin', 'Director', 'School Administrator',
  'Stable Manager', 'Ground Supervisor', 'Housekeeping',
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

  if (!isValidString(itemName, 1, 200)) {
    return res.status(400).json({ error: 'Item name is required (max 200 chars)' })
  }
  if (!isValidString(category, 1, 100)) {
    return res.status(400).json({ error: 'Category is required (max 100 chars)' })
  }
  if (assignedStaffId && !isValidId(assignedStaffId)) {
    return res.status(400).json({ error: 'Invalid assignedStaffId' })
  }
  if (notes && !isValidString(notes, 0, 1000)) {
    return res.status(400).json({ error: 'Notes must be max 1000 chars' })
  }
  if (supplierName && !isValidString(supplierName, 0, 200)) {
    return res.status(400).json({ error: 'Supplier name must be max 200 chars' })
  }
  if (storageLocation && !isValidString(storageLocation, 0, 200)) {
    return res.status(400).json({ error: 'Storage location must be max 200 chars' })
  }
  if (quantity !== undefined) {
    const q = parseFloat(quantity)
    if (isNaN(q) || q < 0 || q > 1000000) {
      return res.status(400).json({ error: 'Quantity must be 0-1000000' })
    }
  }
  if (costPerUnit !== undefined && costPerUnit !== null) {
    const c = parseFloat(costPerUnit)
    if (isNaN(c) || c < 0 || c > 10000000) {
      return res.status(400).json({ error: 'Cost must be 0-10000000' })
    }
  }

  const record = await prisma.housekeepingInventory.create({
    data: {
      itemName: sanitizeString(itemName),
      category: sanitizeString(category),
      quantity: parseFloat(quantity) || 0,
      unitType: unitType || 'pcs',
      minimumStockLevel: minimumStockLevel ? parseFloat(minimumStockLevel) : null,
      reorderAlert: Boolean(reorderAlert),
      storageLocation: storageLocation ? sanitizeString(storageLocation) : null,
      supplierName: supplierName ? sanitizeString(supplierName) : null,
      purchaseDate: purchaseDate ? new Date(purchaseDate) : null,
      expiryDate: expiryDate ? new Date(expiryDate) : null,
      usageArea: usageArea ? sanitizeString(usageArea) : null,
      consumptionRate: consumptionRate ? sanitizeString(consumptionRate) : null,
      lastRestockedDate: lastRestockedDate ? new Date(lastRestockedDate) : null,
      assignedStaffId: assignedStaffId || null,
      costPerUnit: costPerUnit ? parseFloat(costPerUnit) : null,
      notes: notes ? sanitizeString(notes) : null,
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

  if (!isValidId(id)) return res.status(400).json({ error: 'Valid ID is required' })

  const existing = await prisma.housekeepingInventory.findUnique({ where: { id } })
  if (!existing) return res.status(404).json({ error: 'Record not found' })

  const record = await prisma.housekeepingInventory.update({
    where: { id },
    data: {
      ...(itemName && { itemName: sanitizeString(itemName) }),
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
  if (!isValidId(id)) return res.status(400).json({ error: 'Valid ID is required' })

  const record = await prisma.housekeepingInventory.findUnique({ where: { id } })
  if (!record) return res.status(404).json({ error: 'Record not found' })

  if (record.createdById !== user.id && !['Super Admin', 'Director'].includes(user.designation)) {
    return res.status(403).json({ error: 'Permission denied' })
  }

  await prisma.housekeepingInventory.delete({ where: { id } })
  return res.status(200).json({ message: 'Deleted successfully' })
}
