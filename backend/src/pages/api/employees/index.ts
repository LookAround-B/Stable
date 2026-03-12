// pages/api/employees/index.ts
import type { NextApiRequest, NextApiResponse } from 'next'
import { getTokenFromRequest, verifyToken, checkPermission } from '@/lib/auth'
import prisma from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { uploadBase64Image } from '@/lib/s3'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Cross-Origin-Opener-Policy', 'unsafe-none');

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
    
    const where: any = designationValue ? { designation: designationValue } : {}
    
    // Add search filter if provided
    if (searchValue && searchValue.trim().length > 0) {
      where.OR = [
        { fullName: { contains: searchValue, mode: 'insensitive' } },
        { email: { contains: searchValue, mode: 'insensitive' } },
        { designation: { contains: searchValue, mode: 'insensitive' } },
      ]
    }

    const employees = await prisma.employee.findMany({
      where,
      skip: parseInt(skip as string),
      take: parseInt(take as string),
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
      return res.status(400).json({ error: 'Missing required fields' })
    }

    // Upload profile image to R2 if provided as base64
    let imageUrl: string | null = null
    if (profileImage && typeof profileImage === 'string' && profileImage.length > 0) {
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
        fullName,
        email,
        designation,
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

