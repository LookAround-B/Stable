import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '../../../lib/prisma';
import { verifyToken } from '../../../lib/auth';
const corsMiddleware = createCorsMiddleware();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  await runMiddleware(req, res, corsMiddleware);

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Verify authentication
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    // Get user
    const user = await prisma.employee.findUnique({
      where: { id: decoded.id },
    });

    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    // Authorization: Only Stable Manager, Ground Supervisor, and admins
    const allowedRoles = ['Stable Manager', 'Ground Supervisor', 'Super Admin', 'Director', 'School Administrator'];
    if (!allowedRoles.includes(user.designation)) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const { fromDate, toDate } = req.query;

    if (!fromDate || !toDate) {
      return res.status(400).json({ error: 'Missing required parameters: fromDate and toDate' });
    }

    // Parse dates
    const [fromYear, fromMonth, fromDay] = (fromDate as string).split('-').map(Number);
    const [toYear, toMonth, toDay] = (toDate as string).split('-').map(Number);
    
    const startDate = new Date(Date.UTC(fromYear, fromMonth - 1, fromDay, 0, 0, 0));
    const endDate = new Date(Date.UTC(toYear, toMonth - 1, toDay + 1, 0, 0, 0));

    console.log(`Fetching summary from ${startDate.toISOString()} to ${endDate.toISOString()}`);

    // Get all feed records for the period
    const records = await prisma.horseFeed.findMany({
      where: {
        date: {
          gte: startDate,
          lt: endDate,
        },
      },
      include: {
        horse: {
          select: {
            id: true,
            name: true,
            stableNumber: true,
          },
        },
      },
    });

    console.log(`Found ${records.length} records for period`);

    // Aggregate by horse
    const summary: Record<string, any> = {};

    for (const record of records) {
      const horseId = record.horse.id;
      const horseName = record.horse.name;
      const stableNumber = record.horse.stableNumber;

      if (!summary[horseId]) {
        summary[horseId] = {
          horseName,
          stableNumber,
          balance: 0,
          barley: 0,
          oats: 0,
          soya: 0,
          lucerne: 0,
          linseed: 0,
          rOil: 0,
          biotin: 0,
          joint: 0,
          epsom: 0,
          heylase: 0,
        };
      }

      // Add to totals
      summary[horseId].balance += record.balance || 0;
      summary[horseId].barley += record.barley || 0;
      summary[horseId].oats += record.oats || 0;
      summary[horseId].soya += record.soya || 0;
      summary[horseId].lucerne += record.lucerne || 0;
      summary[horseId].linseed += record.linseed || 0;
      summary[horseId].rOil += record.rOil || 0;
      summary[horseId].biotin += record.biotin || 0;
      summary[horseId].joint += record.joint || 0;
      summary[horseId].epsom += record.epsom || 0;
      summary[horseId].heylase += record.heylase || 0;
    }

    return res.status(200).json({
      success: true,
      data: summary,
    });
  } catch (error: any) {
    console.error('Error fetching summary:', error);
    return res.status(500).json({ error: 'Failed to fetch summary' });
  }
}

