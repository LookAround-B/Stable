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

const FEED_TYPES = [
  'balance',
  'barley',
  'oats',
  'soya',
  'lucerne',
  'linseed',
  'rOil',
  'biotin',
  'joint',
  'epsom',
  'heylase',
];

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
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
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

    if (!AUTHORIZED_ROLES.includes(user.designation)) {
      return res.status(403).json({ error: 'You do not have permission to manage feed inventory' });
    }

    switch (req.method) {
      case 'GET':
        return handleGet(req, res);
      case 'POST':
        return handlePost(req, res, user);
      case 'PUT':
        return handlePut(req, res, user);
      default:
        res.setHeader('Allow', ['GET', 'POST', 'PUT']);
        return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error: any) {
    console.error('Feed inventory API error:', error);
    return res.status(500).json({ error: 'Internal server error', message: String(error) });
  }
}

// GET - Fetch inventory records
async function handleGet(req: NextApiRequest, res: NextApiResponse) {
  const { month, year, feedType } = req.query;

  const where: any = {};

  if (month) where.month = parseInt(month as string);
  if (year) where.year = parseInt(year as string);
  if (feedType) where.feedType = feedType as string;

  const records = await prisma.feedInventory.findMany({
    where,
    include: {
      recordedBy: {
        select: { id: true, fullName: true },
      },
    },
    orderBy: [{ year: 'desc' }, { month: 'desc' }, { feedType: 'asc' }],
  });

  // Calculate today's usage for each feed type
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);

  const recordsWithToday = await Promise.all(
    records.map(async (record) => {
      const usedToday = await calculateUsage(record.feedType, todayStart, todayEnd);
      return { ...record, usedToday };
    })
  );

  return res.status(200).json({ data: recordsWithToday, feedTypes: FEED_TYPES });
}

// POST - Create or update inventory entry for a month
async function handlePost(
  req: NextApiRequest,
  res: NextApiResponse,
  user: { id: string; fullName: string; designation: string }
) {
  const { feedType, month, year, unitsBrought, openingStock, unit, notes } = req.body;

  if (!feedType || !month || !year) {
    return res.status(400).json({ error: 'Feed type, month, and year are required' });
  }

  if (!FEED_TYPES.includes(feedType)) {
    return res.status(400).json({ error: `Invalid feed type. Must be one of: ${FEED_TYPES.join(', ')}` });
  }

  const monthNum = parseInt(month);
  const yearNum = parseInt(year);

  if (monthNum < 1 || monthNum > 12) {
    return res.status(400).json({ error: 'Month must be between 1 and 12' });
  }

  // Check if entry already exists
  const existing = await prisma.feedInventory.findUnique({
    where: {
      feedType_month_year: { feedType, month: monthNum, year: yearNum },
    },
  });

  if (existing) {
    return res.status(400).json({ error: 'Inventory entry already exists for this feed type and month. Use PUT to update.' });
  }

  // Calculate total usage from HorseFeed records for this month
  const startDate = new Date(Date.UTC(yearNum, monthNum - 1, 1, 0, 0, 0));
  const endDate = new Date(Date.UTC(yearNum, monthNum, 1, 0, 0, 0));

  const totalUsed = await calculateUsage(feedType, startDate, endDate);
  const openingStockNum = parseFloat(openingStock) || 0;
  const unitsBroughtNum = parseFloat(unitsBrought) || 0;
  const unitsLeft = openingStockNum + unitsBroughtNum - totalUsed;

  const record = await prisma.feedInventory.create({
    data: {
      feedType,
      month: monthNum,
      year: yearNum,
      unitsBrought: unitsBroughtNum,
      openingStock: openingStockNum,
      totalUsed,
      unitsLeft: Math.max(0, unitsLeft),
      unit: unit || 'kg',
      notes: notes || null,
      recordedById: user.id,
    },
    include: {
      recordedBy: {
        select: { id: true, fullName: true },
      },
    },
  });

  return res.status(201).json({ data: record, message: 'Feed inventory entry created successfully' });
}

// PUT - Update inventory entry
async function handlePut(
  req: NextApiRequest,
  res: NextApiResponse,
  _user: { id: string; fullName: string; designation: string }
) {
  const { id, unitsBrought, openingStock, unit, notes } = req.body;

  if (!id) {
    return res.status(400).json({ error: 'Record ID is required' });
  }

  const existing = await prisma.feedInventory.findUnique({ where: { id } });
  if (!existing) {
    return res.status(404).json({ error: 'Inventory record not found' });
  }

  // Recalculate total usage
  const startDate = new Date(Date.UTC(existing.year, existing.month - 1, 1, 0, 0, 0));
  const endDate = new Date(Date.UTC(existing.year, existing.month, 1, 0, 0, 0));

  const totalUsed = await calculateUsage(existing.feedType, startDate, endDate);
  const openingStockNum = parseFloat(openingStock) || existing.openingStock;
  const unitsBroughtNum = parseFloat(unitsBrought) || existing.unitsBrought;
  const unitsLeft = openingStockNum + unitsBroughtNum - totalUsed;

  const record = await prisma.feedInventory.update({
    where: { id },
    data: {
      unitsBrought: unitsBroughtNum,
      openingStock: openingStockNum,
      totalUsed,
      unitsLeft: Math.max(0, unitsLeft),
      unit: unit || existing.unit,
      notes: notes !== undefined ? notes : existing.notes,
    },
    include: {
      recordedBy: {
        select: { id: true, fullName: true },
      },
    },
  });

  return res.status(200).json({ data: record, message: 'Feed inventory entry updated successfully' });
}

// Calculate total usage of a feed type from HorseFeed records
async function calculateUsage(feedType: string, startDate: Date, endDate: Date): Promise<number> {
  const records = await prisma.horseFeed.findMany({
    where: {
      date: { gte: startDate, lt: endDate },
    },
    select: {
      [feedType]: true,
    } as any,
  });

  let total = 0;
  for (const record of records) {
    const value = (record as any)[feedType];
    if (value && typeof value === 'number') {
      total += value;
    }
  }

  return Math.round(total * 100) / 100; // Round to 2 decimal places
}
