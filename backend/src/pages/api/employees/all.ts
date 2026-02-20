// pages/api/employees/all.ts
import type { NextApiRequest, NextApiResponse } from 'next'
import { getTokenFromRequest, verifyToken } from '@/lib/auth'
import prisma from '@/lib/prisma'

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
    return res.status(200).end();
  }
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const token = getTokenFromRequest(req as any)
    if (!token) {
      return res.status(401).json({ error: 'No authorization header' })
    }

    const decoded = verifyToken(token)
    if (!decoded) {
      return res.status(401).json({ error: 'Invalid or expired token' })
    }

    // Get all active employees
    const employees = await prisma.employee.findMany({
      where: {
        employmentStatus: 'Active',
      },
      select: {
        id: true,
        fullName: true,
        email: true,
        designation: true,
        department: true,
        profileImage: true,
      },
      orderBy: {
        fullName: 'asc',
      },
    })

    return res.status(200).json({
      success: true,
      data: employees,
    })
  } catch (error) {
    console.error('Error fetching employees:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}

