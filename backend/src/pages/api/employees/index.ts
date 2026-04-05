// pages/api/employees/index.ts
import type { NextApiRequest, NextApiResponse } from 'next'
import bcrypt from 'bcryptjs'
import { getTokenFromRequest, verifyToken, checkPermission } from '@/lib/auth'
import { rememberJson } from '@/lib/cache'
import {
  cacheKeys,
  CACHE_TTL_SECONDS,
  invalidateEmployeeCaches,
  invalidatePermissionCaches,
} from '@/lib/cacheKeys'
import { setCorsHeaders } from '@/lib/cors'
import prisma from '@/lib/prisma'
import { uploadBase64Image } from '@/lib/s3'
import {
  sanitizeString,
  isValidString,
  isValidEmail,
  isValidPhone,
  safePositiveInt,
  validateBase64Image,
  validationError,
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
      return handleGetEmployees(req, res)
    case 'POST': {
      const allowed = await checkPermission(decoded, 'manageEmployees')
      if (!allowed) {
        return res
          .status(403)
          .json({ error: 'You do not have permission to manage employees' })
      }
      return handleCreateEmployee(req, res)
    }
    default:
      return res.status(405).json({ error: 'Method not allowed' })
  }
}

async function handleGetEmployees(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { designation, skip = 0, take = 1000, search } = req.query

    const designationValue = Array.isArray(designation)
      ? designation[0]
      : designation
    const searchValue = Array.isArray(search) ? search[0] : search
    const parsedSkip = safePositiveInt(skip, 0, 10000)
    const parsedTake = safePositiveInt(take, 1000, 1000)
    const sanitizedDesignation = designationValue
      ? sanitizeString(designationValue)
      : null
    const sanitizedSearch =
      searchValue && searchValue.trim().length > 0
        ? sanitizeString(searchValue).slice(0, 100)
        : null

    const response = await rememberJson(
      cacheKeys.employeesList({
        designation: sanitizedDesignation,
        skip: parsedSkip,
        take: parsedTake,
        search: sanitizedSearch,
      }),
      CACHE_TTL_SECONDS.employeesList,
      async () => {
        const where: {
          designation?: string
          OR?: Array<Record<string, unknown>>
        } = {}

        if (sanitizedDesignation) {
          where.designation = sanitizedDesignation
        }

        if (sanitizedSearch) {
          where.OR = [
            { fullName: { contains: sanitizedSearch, mode: 'insensitive' } },
            { email: { contains: sanitizedSearch, mode: 'insensitive' } },
            { designation: { contains: sanitizedSearch, mode: 'insensitive' } },
          ]
        }

        const employees = await prisma.employee.findMany({
          where,
          skip: parsedSkip,
          take: parsedTake,
          select: {
            id: true,
            fullName: true,
            email: true,
            designation: true,
            colorCode: true,
            profileImage: true,
            employmentStatus: true,
            phoneNumber: true,
            isApproved: true,
          },
          orderBy: { createdAt: 'desc' },
        })

        const total = await prisma.employee.count({ where })

        return {
          data: employees,
          pagination: { total, skip, take },
        }
      }
    )

    return res.status(200).json(response)
  } catch (error) {
    console.error('Error fetching employees:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}

async function handleCreateEmployee(req: NextApiRequest, res: NextApiResponse) {
  try {
    const {
      fullName,
      email,
      designation,
      phoneNumber,
      colorCode,
      shiftTiming,
      supervisorId,
      profileImage,
    } = req.body

    if (!fullName || !email || !designation) {
      return validationError(
        res,
        'Missing required fields: fullName, email, designation'
      )
    }

    if (!isValidString(fullName, 1, 200)) {
      return validationError(res, 'Full name must be 1-200 characters')
    }
    if (!isValidEmail(email)) {
      return validationError(res, 'Invalid email format')
    }
    if (!isValidString(designation, 1, 100)) {
      return validationError(res, 'Invalid designation')
    }
    if (phoneNumber && !isValidPhone(phoneNumber)) {
      return validationError(res, 'Invalid phone number format')
    }

    let imageUrl: string | null = null
    if (profileImage && typeof profileImage === 'string' && profileImage.length > 0) {
      const imgResult = validateBase64Image(profileImage, 5 * 1024 * 1024)
      if (!imgResult.valid) {
        return validationError(res, imgResult.reason)
      }
      imageUrl = await uploadBase64Image(profileImage, 'profiles/employees')
    }

    let department = 'Leadership'
    if (
      [
        'Stable Manager',
        'Instructor',
        'Jamedar',
        'Groom',
        'Riding Boy',
        'Rider',
        'Farrier',
      ].includes(designation)
    ) {
      department = 'Stable Operations'
    } else if (
      [
        'Ground Supervisor',
        'Guard',
        'Electrician',
        'Gardener',
        'Housekeeping',
      ].includes(designation)
    ) {
      department = 'Ground Operations'
    } else if (
      [
        'Senior Executive Accounts',
        'Executive Accounts',
        'Executive Admin',
      ].includes(designation)
    ) {
      department = 'Accounts/Administration'
    }

    const defaultPassword = await bcrypt.hash('password123', 10)

    const employee = await prisma.employee.create({
      data: {
        fullName: sanitizeString(fullName),
        email: email.trim().toLowerCase(),
        designation: sanitizeString(designation),
        password: defaultPassword,
        phoneNumber,
        colorCode,
        shiftTiming,
        department,
        supervisorId: supervisorId || null,
        employmentStatus: 'Active',
        isApproved: false,
        profileImage: imageUrl,
      },
    })

    await Promise.all([
      invalidateEmployeeCaches(employee.id),
      invalidatePermissionCaches(employee.id),
    ])

    return res.status(201).json({
      id: employee.id,
      fullName: employee.fullName,
      email: employee.email,
      designation: employee.designation,
    })
  } catch (error) {
    console.error('Error creating employee:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
