import type { NextApiRequest, NextApiResponse } from 'next'
import { verifyToken, checkPermission } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { setCorsHeaders } from '@/lib/cors'
import { sanitizeString, isValidString, isValidId, safeDate } from '@/lib/validate'

const AUTHORIZED_ROLES = [
  'Super Admin',
  'Director',
  'School Administrator',
  'Stable Manager',
  'Instructor',
  'Ground Supervisor',
  'Jamedar',
] as const

const ENTRY_TYPES = ['Grass', 'Bedding'] as const

const includeRelations = {
  horse: { select: { id: true, name: true, stableNumber: true } },
  collectedBy: { select: { id: true, fullName: true, designation: true } },
  createdBy: { select: { id: true, fullName: true, designation: true } },
}

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

    if (!AUTHORIZED_ROLES.includes(user.designation as (typeof AUTHORIZED_ROLES)[number])) {
      const allowed = await checkPermission(decoded, 'manageInventory')
      if (!allowed) return res.status(403).json({ error: 'Access denied' })
    }

    switch (req.method) {
      case 'GET':
        return handleGet(req, res)
      case 'POST':
        return handlePost(req, res, user.id)
      case 'PUT':
        return handlePut(req, res)
      case 'DELETE':
        return handleDelete(req, res, user)
      default:
        return res.status(405).json({ error: 'Method not allowed' })
    }
  } catch (error) {
    console.error('Grass and bedding API error:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}

async function handleGet(req: NextApiRequest, res: NextApiResponse) {
  const { entryType, horseId, collectedById, search } = req.query
  const where: any = {}

  if (entryType) where.entryType = entryType as string
  if (horseId) where.horseId = horseId as string
  if (collectedById) where.collectedById = collectedById as string
  if (search) {
    where.OR = [
      { supplyName: { contains: search as string, mode: 'insensitive' } },
      { notes: { contains: search as string, mode: 'insensitive' } },
      {
        horse: {
          is: { name: { contains: search as string, mode: 'insensitive' } },
        },
      },
      {
        collectedBy: {
          is: {
            fullName: { contains: search as string, mode: 'insensitive' },
          },
        },
      },
    ]
  }

  const records = await prisma.grassBeddingEntry.findMany({
    where,
    include: includeRelations,
    orderBy: [{ collectedAt: 'desc' }, { createdAt: 'desc' }],
  })

  return res.status(200).json(records)
}

async function handlePost(req: NextApiRequest, res: NextApiResponse, userId: string) {
  const { horseId, entryType, supplyName, collectedById, collectedAt, notes } = req.body

  if (!isValidId(horseId)) {
    return res.status(400).json({ error: 'Valid horseId is required' })
  }
  if (!ENTRY_TYPES.includes(entryType)) {
    return res.status(400).json({ error: `Entry type must be one of: ${ENTRY_TYPES.join(', ')}` })
  }
  if (!isValidString(supplyName, 1, 120)) {
    return res.status(400).json({ error: 'Supply name is required (max 120 chars)' })
  }
  if (!isValidId(collectedById)) {
    return res.status(400).json({ error: 'Valid collectedById is required' })
  }
  const collectedAtDate = safeDate(collectedAt)
  if (!collectedAtDate) {
    return res.status(400).json({ error: 'Valid collectedAt timestamp is required' })
  }
  if (notes && !isValidString(notes, 0, 1000)) {
    return res.status(400).json({ error: 'Notes must be max 1000 chars' })
  }

  const record = await prisma.grassBeddingEntry.create({
    data: {
      horseId,
      entryType,
      supplyName: sanitizeString(supplyName),
      collectedById,
      collectedAt: collectedAtDate,
      notes: notes ? sanitizeString(notes) : null,
      createdById: userId,
    },
    include: includeRelations,
  })

  return res.status(201).json(record)
}

async function handlePut(req: NextApiRequest, res: NextApiResponse) {
  const { id, horseId, entryType, supplyName, collectedById, collectedAt, notes } = req.body

  if (!isValidId(id)) return res.status(400).json({ error: 'Valid ID is required' })
  if (horseId && !isValidId(horseId)) {
    return res.status(400).json({ error: 'Invalid horseId' })
  }
  if (entryType && !ENTRY_TYPES.includes(entryType)) {
    return res.status(400).json({ error: `Entry type must be one of: ${ENTRY_TYPES.join(', ')}` })
  }
  if (supplyName && !isValidString(supplyName, 1, 120)) {
    return res.status(400).json({ error: 'Supply name must be max 120 chars' })
  }
  if (collectedById && !isValidId(collectedById)) {
    return res.status(400).json({ error: 'Invalid collectedById' })
  }
  if (notes && !isValidString(notes, 0, 1000)) {
    return res.status(400).json({ error: 'Notes must be max 1000 chars' })
  }
  if (collectedAt !== undefined && !safeDate(collectedAt)) {
    return res.status(400).json({ error: 'Valid collectedAt timestamp is required' })
  }

  const existing = await prisma.grassBeddingEntry.findUnique({ where: { id } })
  if (!existing) return res.status(404).json({ error: 'Record not found' })

  const record = await prisma.grassBeddingEntry.update({
    where: { id },
    data: {
      ...(horseId !== undefined && { horseId }),
      ...(entryType !== undefined && { entryType }),
      ...(supplyName !== undefined && {
        supplyName: supplyName ? sanitizeString(supplyName) : existing.supplyName,
      }),
      ...(collectedById !== undefined && { collectedById }),
      ...(collectedAt !== undefined && {
        collectedAt: collectedAt ? new Date(collectedAt) : existing.collectedAt,
      }),
      ...(notes !== undefined && { notes: notes ? sanitizeString(notes) : null }),
    },
    include: includeRelations,
  })

  return res.status(200).json(record)
}

async function handleDelete(req: NextApiRequest, res: NextApiResponse, user: any) {
  const { id } = req.body
  if (!isValidId(id)) return res.status(400).json({ error: 'Valid ID is required' })

  const record = await prisma.grassBeddingEntry.findUnique({ where: { id } })
  if (!record) return res.status(404).json({ error: 'Record not found' })

  if (
    record.createdById !== user.id &&
    !['Super Admin', 'Director'].includes(user.designation)
  ) {
    return res.status(403).json({ error: 'Permission denied' })
  }

  await prisma.grassBeddingEntry.delete({ where: { id } })
  return res.status(200).json({ message: 'Deleted successfully' })
}
