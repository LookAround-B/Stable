// pages/api/employees/index.ts
import type { NextApiRequest, NextApiResponse } from 'next'
import { getTokenFromRequest, verifyToken } from '@/lib/auth'
import { handleCorsAndPreflight } from '@/lib/cors'
import prisma from '@/lib/prisma'
import bcrypt from 'bcryptjs'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (handleCorsAndPreflight(req, res)) return;
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
      return handleGetEmployees(req, res)
    case 'POST':
      return handleCreateEmployee(req, res)
    default:
      return res.status(405).json({ error: 'Method not allowed' })
  }
}

async function handleGetEmployees(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { designation, skip = 0, take = 1000 } = req.query

    const designationValue = Array.isArray(designation) ? designation[0] : designation
    const where = designationValue ? { designation: designationValue } : {}

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
    const { fullName, email, designation, phoneNumber, colorCode, shiftTiming, supervisorId } =
      req.body

    if (!fullName || !email || !designation) {
      return res.status(400).json({ error: 'Missing required fields' })
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

