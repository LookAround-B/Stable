// pages/api/auth/login.ts
import type { NextApiRequest, NextApiResponse } from 'next'
import prisma from '@/lib/prisma'
import { generateToken } from '@/lib/auth'
import bcrypt from 'bcryptjs'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { email, password } = req.body

    // Validate input
    if (!email) {
      return res.status(400).json({ error: 'Email is required' })
    }

    if (!password) {
      return res.status(400).json({ error: 'Password is required' })
    }

    // Find user by email
    const user = await prisma.employee.findUnique({
      where: { email },
    })

    if (!user) {
      return res.status(401).json({ 
        error: 'Invalid email or password',
        code: 'INVALID_CREDENTIALS'
      })
    }

    // Verify password
    const passwordMatch = await bcrypt.compare(password, user.password)

    if (!passwordMatch) {
      return res.status(401).json({
        error: 'Invalid email or password',
        code: 'INVALID_CREDENTIALS'
      })
    }

    // Generate token
    const token = generateToken({
      id: user.id,
      email: user.email,
      designation: user.designation,
    })

    return res.status(200).json({
      token,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        designation: user.designation,
        department: user.department,
        isApproved: user.isApproved,
        profileImage: user.profileImage,
      },
    })
  } catch (error) {
    console.error('Login error:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}

