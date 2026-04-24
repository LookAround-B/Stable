import type { NextApiRequest, NextApiResponse } from 'next';
import { OAuth2Client } from 'google-auth-library';
import jwt from 'jsonwebtoken';
import bcryptjs from 'bcryptjs';
import {
  invalidateEmployeeCaches,
  invalidatePermissionCaches,
} from '@/lib/cacheKeys'
import prisma from '@/lib/prisma';
import { setCorsHeaders } from '@/lib/cors'
import { rateLimit } from '@/lib/rateLimit'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const origin = req.headers.origin
  setCorsHeaders(res, origin as string | undefined)

  // Handle preflight OPTIONS request
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Only POST allowed
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Only POST allowed' });
  }

  // Rate limit: 20 Google auth attempts per IP per minute
  const limit = await rateLimit(req as any, { max: 20, windowSecs: 60, prefix: 'auth:google' })
  if (!limit.allowed) {
    res.setHeader('Retry-After', String(limit.resetAt - Math.floor(Date.now() / 1000)))
    return res.status(429).json({ error: 'Too many requests. Please try again in a minute.' })
  }

  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ error: 'Missing token' });
    }

    // Initialize OAuth2 client
    // Using a dummy client ID for now - in production, you should verify against Google's public certs
    const client = new OAuth2Client();

    // Verify the token with Google
    let ticket;
    try {
      ticket = await client.verifyIdToken({
        idToken: token,
        audience: process.env.GOOGLE_CLIENT_ID,
      });
    } catch (error) {
      console.error('Token verification error:', error);
      return res.status(401).json({ error: 'Invalid token' });
    }

    const payload = ticket.getPayload();
    if (!payload) {
      return res.status(401).json({ error: 'Invalid token payload' });
    }

    const { email, name, picture } = payload;

    // Check if user exists
    let user = await prisma.employee.findUnique({
      where: { email: email as string },
    });

    // If user doesn't exist, create one
    if (!user) {
      // Generate a random password for Google OAuth users
      const randomPassword = Math.random().toString(36).slice(-12);
      const hashedPassword = await bcryptjs.hash(randomPassword, 10);

      user = await prisma.employee.create({
        data: {
          fullName: name as string,
          email: email as string,
          password: hashedPassword,
          profileImage: picture,
          designation: 'Groom', // Default role for new Google OAuth users
          department: 'Stable Operations',
          employmentStatus: 'Active',
          isApproved: false,
        },
      });

      await Promise.all([
        invalidateEmployeeCaches(user.id),
        invalidatePermissionCaches(user.id),
      ])
    }

    // Generate JWT token
    const jwtToken = jwt.sign(
      {
        id: user.id,
        email: user.email,
        designation: user.designation,
      },
      process.env.JWT_SECRET || 'dev-only-insecure-secret',
      { expiresIn: '7d' }
    );

    // Return user and token
    return res.status(200).json({
      token: jwtToken,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        designation: user.designation,
        profileImage: user.profileImage,
        isApproved: user.isApproved,
      },
      message: 'Logged in successfully',
    });
  } catch (error) {
    console.error('Google auth error:', error);
    res.status(500).json({
      error: 'Authentication failed',
      message: 'Authentication failed',
    });
  }
}
