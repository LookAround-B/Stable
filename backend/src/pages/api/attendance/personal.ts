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
  const { date } = req.query;

  try {
    // Parse date if provided
    let dateFilter: any = {};

    if (date) {
      const startDate = new Date(date as string);
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + 1);

      dateFilter = {
        date: {
          gte: startDate,
          lt: endDate
        }
      };
    }

    // Get personal attendance records
    const records = await prisma.attendance.findMany({
      where: {
        employeeId: userId,
        ...dateFilter
      },
      orderBy: {
        date: 'desc'
      },
      take: 100
    });

    return res.status(200).json({ records });
  } catch (error) {
    console.error('Error getting personal attendance:', error);
    return res.status(500).json({ error: 'Failed to fetch attendance records' });
  }
}

export default handler;

