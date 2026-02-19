// pages/api/auth/profile.ts
import type { NextApiRequest, NextApiResponse } from 'next'
import prisma from '@/lib/prisma'
import { generateToken } from '@/lib/auth'
import { runMiddleware } from '@/lib/cors'
import cors from 'cors'

const corsMiddleware = cors({
  origin: ['http://localhost:3001', 'http://localhost:3002', 'http://localhost:3000'],
  credentials: true,
})

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Run CORS middleware
  await runMiddleware(req, res, corsMiddleware)

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const authHeader = req.headers.authorization
    if (!authHeader) {
      return res.status(401).json({ error: 'Unauthorized' })
    }
    
    const { fullName, phoneNumber, designation } = req.body

    if (!fullName || !phoneNumber) {
      return res.status(400).json({ error: 'Full name and phone number are required' })
    }

    // For now, we'll extract the email from the request body or token
    // In a real scenario, you'd decode the token to get user info
    const email = req.body.email || 'unknown@example.com'

    // Find user by email (assuming email is passed in body or from token)
    let user = await prisma.employee.findUnique({
      where: { email },
    })

    if (!user) {
      return res.status(404).json({ error: 'User not found' })
    }

    // Update user profile
    user = await prisma.employee.update({
      where: { email },
      data: {
        fullName,
        phoneNumber,
        ...(designation && { designation }),
      },
    })

    // Generate new token with updated info
    const newToken = generateToken({
      id: user.id,
      email: user.email,
      designation: user.designation,
    })

    return res.status(200).json({
      token: newToken,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        phoneNumber: user.phoneNumber,
        designation: user.designation,
        employmentStatus: user.employmentStatus,
      },
    })
  } catch (error) {
    console.error('Profile error:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
