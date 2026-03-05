import { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();

async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Set CORS headers FIRST (before any other logic)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Cross-Origin-Opener-Policy', 'unsafe-none');

  // Handle OPTIONS preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
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

  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized - No user ID' });
  }

  // Verify user is a Guard or supervisor
  const user = await prisma.employee.findUnique({
    where: { id: userId },
    select: { designation: true, id: true }
  });

  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  // Allow Guards and supervisors to record exits
  const ALLOWED_ROLES = ['Guard', 'Super Admin', 'Director', 'School Administrator', 'Stable Manager', 'Ground Supervisor'];
  const userDesignation = user.designation?.trim();
  const canRecord = ALLOWED_ROLES.includes(userDesignation);

  if (!canRecord) {
    return res.status(403).json({ 
      error: 'Only Guards and supervisors can record exits',
      userRole: userDesignation
    });
  }

  try {
    let { entryId } = req.query;

    if (Array.isArray(entryId)) {
      entryId = entryId[0];
    }

    if (!entryId) {
      return res.status(400).json({ error: 'Entry ID required' });
    }

    // Get the entry
    const entry = await prisma.gateEntry.findUnique({
      where: { id: entryId }
    });

    if (!entry) {
      return res.status(404).json({ error: 'Entry not found' });
    }

    // Update with exit time
    const updated = await prisma.gateEntry.update({
      where: { id: entryId },
      data: {
        exitTime: new Date()
      },
      include: {
        employee: {
          select: {
            id: true,
            fullName: true,
            designation: true
          }
        },
        visitor: {
          select: {
            id: true,
            name: true,
            purpose: true
          }
        }
      }
    });

    return res.status(200).json({ message: 'Exit recorded', entry: updated });
  } catch (error) {
    console.error('Error recording exit:', error);
    return res.status(500).json({ error: 'Failed to record exit' });
  }
}

export default handler;
