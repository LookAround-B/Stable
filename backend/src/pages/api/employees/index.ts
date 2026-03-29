// pages/api/employees/index.ts
import type { NextApiRequest, NextApiResponse } from 'next'
import { getTokenFromRequest, verifyToken, checkPermission } from '@/lib/auth'
import { setCorsHeaders } from '@/lib/cors'
import prisma from '@/lib/prisma'
import bcrypt from 'bcryptjs'
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

  // Check authentication
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
      // Any authenticated user can list employees (needed for task assignment, dropdowns, etc.)
      return handleGetEmployees(req, res)
    case 'POST': {
      // Only users with manageEmployees permission can create employees
      const allowed = await checkPermission(decoded, 'manageEmployees')
      if (!allowed) {
        return res.status(403).json({ error: 'You do not have permission to manage employees' })
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

    const designationValue = Array.isArray(designation) ? designation[0] : designation
    const searchValue = Array.isArray(search) ? search[0] : search
    
    const where: any = designationValue ? { designation: sanitizeString(designationValue) } : {}
    
    // Add search filter if provided — sanitize search input
    if (searchValue && searchValue.trim().length > 0) {
      const sanitizedSearch = sanitizeString(searchValue).slice(0, 100)
      where.OR = [
        { fullName: { contains: sanitizedSearch, mode: 'insensitive' } },
        { email: { contains: sanitizedSearch, mode: 'insensitive' } },
        { designation: { contains: sanitizedSearch, mode: 'insensitive' } },
      ]
    }

    const employees = await prisma.employee.findMany({
      where,
      skip: safePositiveInt(skip, 0, 10000),
      take: safePositiveInt(take, 1000, 1000),
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

    return res.status(200).json({
      data: employees,
      pagination: { total, skip, take },
    })
  } catch (error) {
    console.error('Error fetching employees:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}

async function handleCreateEmployee(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { fullName, email, designation, phoneNumber, colorCode, shiftTiming, supervisorId, profileImage } =
      req.body

    if (!fullName || !email || !designation) {
      return validationError(res, 'Missing required fields: fullName, email, designation')
    }

    // Strict type + format validation
    if (!isValidString(fullName, 1, 200)) return validationError(res, 'Full name must be 1-200 characters')
    if (!isValidEmail(email)) return validationError(res, 'Invalid email format')
    if (!isValidString(designation, 1, 100)) return validationError(res, 'Invalid designation')
    if (phoneNumber && !isValidPhone(phoneNumber)) return validationError(res, 'Invalid phone number format')

    // Upload profile image to R2 if provided as base64
    let imageUrl: string | null = null
    if (profileImage && typeof profileImage === 'string' && profileImage.length > 0) {
      const imgResult = validateBase64Image(profileImage, 5 * 1024 * 1024)
      if (!imgResult.valid) return validationError(res, imgResult.reason)
      imageUrl = await uploadBase64Image(profileImage, 'profiles/employees')
    }

    // Determine department based on designation
    let department = 'Leadership'
    if (['Stable Manager', 'Instructor', 'Jamedar', 'Groom', 'Riding Boy', 'Rider', 'Farrier'].includes(designation)) {
      department = 'Stable Operations'
    } else if (['Ground Supervisor', 'Guard', 'Electrician', 'Gardener', 'Housekeeping'].includes(designation)) {
      department = 'Ground Operations'
    } else if (['Senior Executive Accounts', 'Executive Accounts', 'Executive Admin'].includes(designation)) {
      department = 'Accounts/Administration'
    }

    // Hash default password for new employees
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

