import type { NextApiRequest, NextApiResponse } from 'next';
import { verifyToken } from '@/lib/auth';
import prisma from '@/lib/prisma';

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '1mb',
    },
  },
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Cross-Origin-Opener-Policy', 'unsafe-none');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // Verify authentication
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'No authorization header' });
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    const user = await prisma.employee.findUnique({
      where: { id: decoded.id },
      select: { id: true, email: true, designation: true, fullName: true },
    });

    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    const { id } = req.query;

    if (req.method === 'GET') {
      return handleGet(id as string, res);
    } else {
      res.setHeader('Allow', ['GET']);
      return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error: any) {
    console.error('Medicine log detail API error:', error);
    return res.status(500).json({ error: 'Internal server error', message: String(error) });
  }
}

// GET - Fetch single medicine log
async function handleGet(id: string, res: NextApiResponse) {
  try {
    const log = await prisma.medicineLog.findUnique({
      where: { id },
      include: {
        jamedar: {
          select: {
            id: true,
            fullName: true,
            designation: true,
          },
        },
        horse: {
          select: {
            id: true,
            name: true,
          },
        },
        approvedBy: {
          select: {
            id: true,
            fullName: true,
            designation: true,
          },
        },
      },
    });

    if (!log) {
      return res.status(404).json({ error: 'Medicine log not found' });
    }

    return res.status(200).json(log);
  } catch (error: any) {
    console.error('Error fetching medicine log:', error);
    return res.status(500).json({ error: 'Failed to fetch medicine log' });
  }
}
