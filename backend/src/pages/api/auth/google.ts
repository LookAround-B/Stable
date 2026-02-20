import { NextApiRequest, NextApiResponse } from 'next';
import { OAuth2Client } from 'google-auth-library';
import jwt from 'jsonwebtoken';
import bcryptjs from 'bcryptjs';
import { prisma } from '../../../lib/prisma';
import { setCorsHeaders } from '../../../lib/cors';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Set CORS headers for all requests
  const origin = req.headers.origin as string;
  setCorsHeaders(res, origin);

  // Remove any restrictive COOP headers that might block OAuth
  res.removeHeader('Cross-Origin-Opener-Policy');
  res.removeHeader('Cross-Origin-Embedder-Policy');

  // Debug logging
  console.log('[google.ts] Request:', {
    method: req.method,
    origin: origin,
    headers: Object.keys(req.headers),
  });

  // Handle preflight OPTIONS request
  if (req.method === 'OPTIONS') {
    console.log('[google.ts] Handling OPTIONS preflight');
    return res.status(200).end();
  }

  // Only allow POST
  if (req.method !== 'POST') {
    console.log('[google.ts] Method not POST:', req.method);
    return res.status(405).json({ error: 'Method not allowed. Use POST.' });
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
        audience: process.env.GOOGLE_CLIENT_ID || '244506553129-hcdjduecje6h3lt29umvdokatroau63p.apps.googleusercontent.com',
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
    }

    // Generate JWT token
    const jwtToken = jwt.sign(
      {
        id: user.id,
        email: user.email,
        role: user.designation,
      },
      process.env.JWT_SECRET || 'your-secret-key',
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
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

