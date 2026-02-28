import type { NextApiRequest, NextApiResponse } from 'next';
import { verifyToken } from '@/lib/auth';
import prisma from '@/lib/prisma';

const AUTHORIZED_ROLES = [
  'Super Admin',
  'Director',
  'School Administrator',
  'Stable Manager',
  'Ground Supervisor',
];

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Cross-Origin-Opener-Policy', 'unsafe-none');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Unauthorized' });

    const decoded = verifyToken(token);
    if (!decoded) return res.status(401).json({ error: 'Invalid token' });

    const user = await prisma.employee.findUnique({ where: { id: decoded.id } });
    if (!user) return res.status(401).json({ error: 'User not found' });
    if (!AUTHORIZED_ROLES.includes(user.designation)) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const { month, year } = req.body;
    if (!month || !year) {
      return res.status(400).json({ error: 'month and year are required' });
    }

    const monthNum = parseInt(month);
    const yearNum = parseInt(year);

    const startDate = new Date(Date.UTC(yearNum, monthNum - 1, 1, 0, 0, 0));
    const endDate = new Date(Date.UTC(yearNum, monthNum, 1, 0, 0, 0));

    // Recalculate usage for all feed types that have inventory records
    const inventoryRecords = await prisma.feedInventory.findMany({
      where: { month: monthNum, year: yearNum },
    });

    const updatedRecords = [];

    for (const record of inventoryRecords) {
      const feedRecords = await prisma.horseFeed.findMany({
        where: { date: { gte: startDate, lt: endDate } },
        select: { [record.feedType]: true } as any,
      });

      let totalUsed = 0;
      for (const fr of feedRecords) {
        const val = (fr as any)[record.feedType];
        if (val && typeof val === 'number') {
          totalUsed += val;
        }
      }

      totalUsed = Math.round(totalUsed * 100) / 100;
      const unitsLeft = Math.max(0, record.openingStock + record.unitsBrought - totalUsed);

      const updated = await prisma.feedInventory.update({
        where: { id: record.id },
        data: {
          totalUsed,
          unitsLeft: Math.round(unitsLeft * 100) / 100,
        },
        include: {
          recordedBy: { select: { id: true, fullName: true } },
        },
      });

      updatedRecords.push(updated);
    }

    return res.status(200).json({
      data: updatedRecords,
      message: `Recalculated ${updatedRecords.length} inventory records for ${monthNum}/${yearNum}`,
    });
  } catch (error: any) {
    console.error('Recalculate error:', error);
    return res.status(500).json({ error: 'Failed to recalculate inventory' });
  }
}
