// pages/api/auth/login.ts
import type { NextApiRequest, NextApiResponse } from 'next'
import prisma from '@/lib/prisma'
import { generateToken, getTaskCapabilitiesForUser } from '@/lib/auth'
import { setCorsHeaders } from '@/lib/cors'
import bcrypt from 'bcryptjs'
import { isValidEmail, isValidString, validationError } from '@/lib/validate'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const origin = req.headers.origin
  setCorsHeaders(res, origin as string | undefined)

  // Handle OPTIONS preflight
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const { email, password } = req.body

    // Validate input
    if (!email || !isValidEmail(email)) {
      validationError(res, 'A valid email is required');
      return;
    }

    if (!password || !isValidString(password, 1, 200)) {
      validationError(res, 'Password is required');
      return;
    }

    // Find user by email (include permissions for real-time access control)
    const user = await prisma.employee.findUnique({
      where: { email },
      include: {
        permissions: {
          select: {
            manageEmployees: true,
            viewReports: true,
            issueFines: true,
            manageInventory: true,
            manageSchedules: true,
            viewPayroll: true,
          },
        },
      },
    })

    if (!user) {
      res.status(401).json({ 
        error: 'Invalid email or password',
        code: 'INVALID_CREDENTIALS'
      });
      return;
    }

    // Verify password
    const passwordMatch = await bcrypt.compare(password, user.password)

    if (!passwordMatch) {
      res.status(401).json({
        error: 'Invalid email or password',
        code: 'INVALID_CREDENTIALS'
      });
      return;
    }

    // Generate token
    const token = generateToken({
      id: user.id,
      email: user.email,
      designation: user.designation,
    })
    const taskCapabilities = await getTaskCapabilitiesForUser(
      user.id,
      user.designation
    )

    res.status(200).json({
      token,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        designation: user.designation,
        department: user.department,
        isApproved: user.isApproved,
        profileImage: user.profileImage,
        permissions: user.permissions || null,
        taskCapabilities,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
