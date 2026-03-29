import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '../../../lib/prisma';
import { verifyToken } from '../../../lib/auth';
import { uploadBase64Image } from '../../../lib/s3';
import { setCorsHeaders } from '@/lib/cors'

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb',
    },
  },
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const origin = req.headers.origin
  setCorsHeaders(res, origin as string | undefined)

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

    const { fullName, phoneNumber, profileImage } = req.body;

    // Validate input — require at least a name or a profile image
    if (!fullName && !profileImage) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Build update data — only include safe fields (NOT designation — prevents privilege escalation)
    const updateData: any = {};
    if (fullName) {
      if (typeof fullName !== 'string' || fullName.trim().length < 1 || fullName.trim().length > 200) {
        return res.status(400).json({ error: 'Full name must be 1-200 characters' });
      }
      updateData.fullName = fullName.replace(/<[^>]*>/g, '').trim();
    }
    if (phoneNumber) {
      if (typeof phoneNumber !== 'string' || !/^\+?[\d\s\-()]{6,20}$/.test(phoneNumber.trim())) {
        return res.status(400).json({ error: 'Invalid phone number format' });
      }
      updateData.phoneNumber = phoneNumber.trim();
    }
    // NOTE: designation intentionally NOT updateable through this endpoint
    if (profileImage !== undefined) {
      // If it's a base64 string, upload to R2 and store the CDN URL
      if (typeof profileImage === 'string' && profileImage.length > 0) {
        updateData.profileImage = await uploadBase64Image(profileImage, 'profiles/employees');
      } else {
        updateData.profileImage = profileImage;
      }
    }

    // Update user profile
    const updatedUser = await prisma.employee.update({
      where: { id: payload.id },
      data: updateData,
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
      error: 'Failed to update profile',
    });
  }
}

