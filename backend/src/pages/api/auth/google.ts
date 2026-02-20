import { NextApiRequest, NextApiResponse } from 'next';
import { OAuth2Client } from 'google-auth-library';
import jwt from 'jsonwebtoken';
import bcryptjs from 'bcryptjs';
import { prisma } from '../../../lib/prisma';
import { setCorsHeaders } from '../../../lib/cors';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const origin = req.headers.origin as string;
  
  // Clear any restrictive security headers that might block OAuth
  res.removeHeader('Cross-Origin-Opener-Policy');
  res.removeHeader('Cross-Origin-Embedder-Policy');
  res.removeHeader('X-Frame-Options');
  res.removeHeader('X-Content-Type-Options');
  
  // Set permissive CORS headers for OAuth
  res.setHeader('Access-Control-Allow-Origin', origin || '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  
  // Explicitly prevent any COOP/COEP headers by setting to 'unsafe-none'
  res.setHeader('Cross-Origin-Opener-Policy', 'unsafe-none');
  res.setHeader('Cross-Origin-Embedder-Policy', 'unsafe-none');

  console.log('[google.ts] Handling', req.method, 'from origin:', origin);

  // Handle preflight OPTIONS
  if (req.method === 'OPTIONS') {
    console.log('[google.ts] Returning 200 for OPTIONS');
    return res.status(200).json({ ok: true });
  }

  // Only POST allowed
  if (req.method !== 'POST') {
    console.log('[google.ts] 405: Method not allowed -', req.method);
    return res.status(405).json({ error: 'Only POST allowed' });
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

