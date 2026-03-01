import type { NextApiRequest, NextApiResponse } from 'next';
import { verifyToken } from '@/lib/auth';
import prisma from '@/lib/prisma';

const JAMEDAR_ROLES = ['Jamedar'];

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
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Cross-Origin-Opener-Policy', 'unsafe-none');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ error: 'Method not allowed' });
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

    // Check authorization
    if (!JAMEDAR_ROLES.includes(user.designation)) {
      return res.status(403).json({ error: 'Only Jamedar can view their own logs' });
    }

    // Get logged-in user's medicine logs
    const myLogs = await prisma.medicineLog.findMany({
      where: {
        jamiedarId: user.id,
      },
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
      orderBy: {
        timeAdministered: 'desc',
      },
    });

    return res.status(200).json({ data: myLogs });
  } catch (error: any) {
    console.error('Error fetching my medicine logs:', error);
    return res.status(500).json({ error: 'Failed to fetch medicine logs', message: String(error) });
  }
}
