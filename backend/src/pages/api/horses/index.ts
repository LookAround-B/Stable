// pages/api/horses/index.ts
import type { NextApiRequest, NextApiResponse } from 'next'
import { getTokenFromRequest, verifyToken } from '@/lib/auth'
import { rememberJson } from '@/lib/cache'
import {
  cacheKeys,
  CACHE_TTL_SECONDS,
  invalidateHorseCaches,
} from '@/lib/cacheKeys'
import prisma from '@/lib/prisma'
import { uploadBase64Image } from '@/lib/s3'
import { setCorsHeaders } from '@/lib/cors'
import {
  sanitizeString,
  isValidString,
  isOneOf,
  safeDate,
  validateBase64Image,
  safePositiveInt,
} from '@/lib/validate'

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
    return res.status(401).json({ error: 'No authorization header' })
  }

  const decoded = verifyToken(token)
  if (!decoded) {
    return res.status(401).json({ error: 'Invalid or expired token' })
  }

  switch (req.method) {
    case 'GET':
      return handleGetHorses(req, res)
    case 'POST':
      return handleCreateHorse(req, res)
    default:
      return res.status(405).json({ error: 'Method not allowed' })
  }
}

async function handleGetHorses(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { status, skip = 0, take = 1000, search } = req.query

    const statusValue = Array.isArray(status) ? status[0] : status
    const searchValue = Array.isArray(search) ? search[0] : search
    const parsedSkip = safePositiveInt(skip, 0)
    const parsedTake = safePositiveInt(take, 1000, 1000)
    const safeStatus = statusValue ? String(statusValue).slice(0, 50) : null
    const safeSearch =
      searchValue && searchValue.trim().length > 0
        ? String(searchValue).slice(0, 100)
        : null

    const response = await rememberJson(
      cacheKeys.horsesList({
        status: safeStatus,
        skip: parsedSkip,
        take: parsedTake,
        search: safeSearch,
      }),
      CACHE_TTL_SECONDS.horsesList,
      async () => {
        const where: {
          status?: string
          OR?: Array<Record<string, unknown>>
        } = {}

        if (safeStatus) {
          where.status = safeStatus
        }

        if (safeSearch) {
          where.OR = [
            { name: { contains: safeSearch, mode: 'insensitive' } },
            { breed: { contains: safeSearch, mode: 'insensitive' } },
            { stableNumber: { contains: safeSearch, mode: 'insensitive' } },
          ]
        }

        const horses = await prisma.horse.findMany({
          where,
          skip: parsedSkip,
          take: parsedTake,
          orderBy: { createdAt: 'desc' },
          include: {
            supervisor: true,
          },
        })

        const total = await prisma.horse.count({ where })

        return {
          data: horses,
          pagination: { total, skip, take },
        }
      }
    )

    return res.status(200).json(response)
  } catch (error) {
    console.error('Error fetching horses:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}

async function handleCreateHorse(req: NextApiRequest, res: NextApiResponse) {
  try {
    const {
      name,
      gender,
      dateOfBirth,
      breed,
      color,
      height,
      stableNumber,
      supervisorId,
      status,
      profileImage,
      passportNumber,
    } = req.body

    if (!isValidString(name, 1, 100)) {
      return res.status(400).json({ error: 'Name is required (max 100 chars)' })
    }
    if (!isOneOf(gender, ['Male', 'Female', 'Gelding'] as const)) {
      return res.status(400).json({ error: 'Invalid gender' })
    }
    const dob = safeDate(dateOfBirth)
    if (!dob) {
      return res.status(400).json({ error: 'Valid date of birth is required' })
    }
    if (breed && !isValidString(breed, 0, 100)) {
      return res.status(400).json({ error: 'Breed must be max 100 chars' })
    }
    if (color && !isValidString(color, 0, 50)) {
      return res.status(400).json({ error: 'Color must be max 50 chars' })
    }
    if (height !== undefined && height !== null) {
      const parsedHeight = parseFloat(height)
      if (isNaN(parsedHeight) || parsedHeight < 0 || parsedHeight > 25) {
        return res.status(400).json({ error: 'Height must be between 0 and 25' })
      }
    }
    if (stableNumber && !isValidString(stableNumber, 0, 20)) {
      return res
        .status(400)
        .json({ error: 'Stable number must be max 20 chars' })
    }
    if (
      status &&
      !isOneOf(status, [
        'Active',
        'Inactive',
        'Retired',
        'Deceased',
        'Sold',
        'Transferred',
      ] as const)
    ) {
      return res.status(400).json({ error: 'Invalid status' })
    }

    if (passportNumber && passportNumber.trim().length > 0) {
      const passportRegex = /^[A-Za-z0-9][A-Za-z0-9\s\-\/]{1,49}$/
      if (!passportRegex.test(passportNumber.trim())) {
        return res.status(400).json({
          error:
            'Invalid passport number format. Use alphanumeric characters, hyphens, and forward slashes (3-50 characters).',
        })
      }
    }

    let imageUrl: string | null = null
    if (profileImage && typeof profileImage === 'string' && profileImage.length > 0) {
      const imgCheck = validateBase64Image(profileImage, 5 * 1024 * 1024)
      if (!imgCheck.valid) {
        return res.status(400).json({ error: imgCheck.reason })
      }
      imageUrl = await uploadBase64Image(profileImage, 'profiles/horses')
    }

    const horse = await prisma.horse.create({
      data: {
        name: sanitizeString(name),
        gender,
        dateOfBirth: dob,
        breed: breed ? sanitizeString(breed) : null,
        color: color ? sanitizeString(color) : null,
        height: height ? parseFloat(height) : null,
        stableNumber: stableNumber ? sanitizeString(stableNumber) : null,
        supervisorId: supervisorId || null,
        status: status || 'Active',
        profileImage: imageUrl,
        passportNumber:
          passportNumber && passportNumber.trim().length > 0
            ? passportNumber.trim().toUpperCase()
            : null,
      },
      include: {
        supervisor: true,
      },
    })

    await invalidateHorseCaches()

    return res.status(201).json(horse)
  } catch (error) {
    console.error('Error creating horse:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
