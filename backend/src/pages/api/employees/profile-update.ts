import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '../../../lib/prisma';
import { verifyToken } from '../../../lib/auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Set CORS headers FIRST
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Cross-Origin-Opener-Policy', 'unsafe-none');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'PUT' && req.method !== 'OPTIONS') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Handle OPTIONS request
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // Verify JWT token
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing or invalid token' });
    }

    const token = authHeader.substring(7);
    const payload = verifyToken(token);

    if (!payload || !payload.id) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    const { fullName, phoneNumber, designation } = req.body;

    // Validate input
    if (!fullName || !phoneNumber || !designation) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Update user profile
    const updatedUser = await prisma.employee.update({
      where: { id: payload.id },
      data: {
        fullName,
        phoneNumber,
        designation,
      },
      select: {
        id: true,
        email: true,
        fullName: true,
        phoneNumber: true,
        designation: true,
        isApproved: true,
        profileImage: true,
      },
    });

    return res.status(200).json({
      message: 'Profile updated successfully',
      user: updatedUser,
    });
  } catch (error: any) {
    console.error('Profile update error:', error);
    return res.status(500).json({
      error: error.message || 'Failed to update profile',
    });
  }
}

