import { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';
import { runMiddleware } from '../../../lib/cors';
import cors from 'cors';

const prisma = new PrismaClient();

const corsMiddleware = cors({
  origin: ['http://localhost:3001', 'http://localhost:3002', 'http://localhost:3000'],
  credentials: true,
});

async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Apply CORS middleware
  await runMiddleware(req, res, corsMiddleware);

  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Verify JWT token
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) {
    return res.status(401).json({ error: 'Unauthorized - No token' });
  }

  let decoded: any;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
  } catch (err) {
    return res.status(401).json({ error: 'Unauthorized - Invalid token' });
  }

  const userId = decoded?.id;

  try {
    // Get the current user
    const user = await prisma.employee.findUnique({
      where: { id: userId },
      select: { designation: true, id: true, department: true }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    let teamMembers: any[] = [];

    if (user.designation === 'Jamedar') {
      // Jamadars see all staff in their department (Stable Operations) except other supervisors
      teamMembers = await prisma.employee.findMany({
        where: {
          department: 'Stable Operations',
          designation: {
            notIn: ['Super Admin', 'Director', 'School Administrator', 'Stable Manager', 'Jamedar']
          }
        },
        select: {
          id: true,
          fullName: true,
          designation: true
        },
        orderBy: {
          fullName: 'asc'
        }
      });
    } else if (user.designation === 'Stable Manager') {
      // Stable Manager sees all staff in Stable Operations except other supervisors
      teamMembers = await prisma.employee.findMany({
        where: {
          department: 'Stable Operations',
          designation: {
            notIn: ['Super Admin', 'Director', 'School Administrator', 'Stable Manager']
          }
        },
        select: {
          id: true,
          fullName: true,
          designation: true
        },
        orderBy: {
          fullName: 'asc'
        }
      });
    } else if (user.designation === 'Ground Supervisor') {
      // Ground Supervisor sees all staff in Ground Operations
      teamMembers = await prisma.employee.findMany({
        where: {
          department: 'Ground Operations',
          designation: { not: 'Ground Supervisor' }
        },
        select: {
          id: true,
          fullName: true,
          designation: true
        },
        orderBy: {
          fullName: 'asc'
        }
      });
    } else if (['Super Admin', 'Director', 'School Administrator'].includes(user.designation)) {
      // Admin roles see everyone except other admin roles
      teamMembers = await prisma.employee.findMany({
        where: {
          designation: {
            notIn: ['Super Admin', 'Director', 'School Administrator']
          }
        },
        select: {
          id: true,
          fullName: true,
          designation: true
        },
        orderBy: {
          fullName: 'asc'
        }
      });
    }

    return res.status(200).json({ teamMembers });
  } catch (error) {
    console.error('Error getting team members:', error);
    return res.status(500).json({ error: 'Failed to fetch team members' });
  }
}

export default handler;
