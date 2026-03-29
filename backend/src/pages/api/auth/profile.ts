// pages/api/auth/profile.ts
import type { NextApiRequest, NextApiResponse } from 'next'
import prisma from '@/lib/prisma'
import { generateToken, getTokenFromRequest, verifyToken } from '@/lib/auth'
import { setCorsHeaders } from '@/lib/cors'
import { sanitizeString, isValidString, isValidPhone, validationError } from '@/lib/validate'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const origin = req.headers.origin as string;
  setCorsHeaders(res, origin);

  // Handle OPTIONS preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).json({ ok: true });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    // Properly verify JWT token to get the authenticated user's identity
    const token = getTokenFromRequest(req as any)
    if (!token) {
      return res.status(401).json({ error: 'No authorization header' })
    }
    const decoded = verifyToken(token)
    if (!decoded) {
      return res.status(401).json({ error: 'Invalid or expired token' })
    }
    
    const { fullName, phoneNumber } = req.body

    if (!fullName || !phoneNumber) {
      return validationError(res, 'Full name and phone number are required')
    }

    // Validate input
    if (!isValidString(fullName, 1, 200)) {
      return validationError(res, 'Full name must be 1-200 characters')
    }
    if (!isValidPhone(phoneNumber)) {
      return validationError(res, 'Invalid phone number format')
    }

    // Use authenticated user's ID from JWT — NOT email from body (prevents IDOR)
    let user = await prisma.employee.findUnique({
      where: { id: decoded.id },
    })

    if (!user) {
      return res.status(404).json({ error: 'User not found' })
    }

    // Only update safe fields — NOT designation (prevents privilege escalation)
    user = await prisma.employee.update({
      where: { id: decoded.id },
      data: {
        fullName: sanitizeString(fullName),
        phoneNumber: phoneNumber.trim(),
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

