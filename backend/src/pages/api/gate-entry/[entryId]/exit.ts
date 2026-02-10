import { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';
import { runMiddleware } from '../../../../lib/cors';
import cors from 'cors';

const prisma = new PrismaClient();

const corsMiddleware = cors({
  origin: ['http://localhost:3001', 'http://localhost:3002', 'http://localhost:3000'],
  credentials: true,
});

async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Apply CORS middleware
  await runMiddleware(req, res, corsMiddleware);

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

  // Verify user is a Guard
  const user = await prisma.employee.findUnique({
    where: { id: userId },
    select: { designation: true }
  });

  if (!user || user.designation !== 'Guard') {
    return res.status(403).json({ error: 'Only Guards can record exits' });
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
