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

const FEED_LABELS: Record<string, string> = {
  balance: 'Balance',
  barley: 'Barley',
  oats: 'Oats',
  soya: 'Soya',
  lucerne: 'Lucerne',
  linseed: 'Linseed',
  rOil: 'R.Oil',
  biotin: 'Biotin',
  joint: 'Joint',
  epsom: 'Epsom',
  heylase: 'Heylase',
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

    const user = await prisma.employee.findUnique({
      where: { id: decoded.id },
    });

    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    if (!AUTHORIZED_ROLES.includes(user.designation)) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const { startDate, endDate, format } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({ error: 'startDate and endDate are required (YYYY-MM-DD)' });
    }

    // Parse dates
    const [fromYear, fromMonth, fromDay] = (startDate as string).split('-').map(Number);
    const [toYear, toMonth, toDay] = (endDate as string).split('-').map(Number);

    const start = new Date(Date.UTC(fromYear, fromMonth - 1, fromDay, 0, 0, 0));
    const end = new Date(Date.UTC(toYear, toMonth - 1, toDay + 1, 0, 0, 0));

    // Get all feed records for the date range
    const feedRecords = await prisma.horseFeed.findMany({
      where: {
        date: { gte: start, lt: end },
      },
      include: {
        horse: {
          select: { id: true, name: true, stableNumber: true },
        },
      },
      orderBy: { date: 'asc' },
    });

    // === Per-Horse Consumption ===
    const horseConsumption: Record<string, any> = {};

    for (const record of feedRecords) {
      const horseId = record.horse.id;
      if (!horseConsumption[horseId]) {
        horseConsumption[horseId] = {
          horseName: record.horse.name,
          stableNumber: record.horse.stableNumber,
          daysRecorded: 0,
          feeds: {} as Record<string, number>,
        };
        for (const ft of FEED_TYPES) {
          horseConsumption[horseId].feeds[ft] = 0;
        }
      }

      horseConsumption[horseId].daysRecorded += 1;
      for (const ft of FEED_TYPES) {
        const val = (record as any)[ft];
        if (val && typeof val === 'number') {
          horseConsumption[horseId].feeds[ft] += val;
        }
      }
    }

    // Round values
    for (const horseId of Object.keys(horseConsumption)) {
      for (const ft of FEED_TYPES) {
        horseConsumption[horseId].feeds[ft] = Math.round(horseConsumption[horseId].feeds[ft] * 100) / 100;
      }
    }

    // === Daily Breakdown ===
    const dailyBreakdown: Record<string, Record<string, number>> = {};

    for (const record of feedRecords) {
      const dateStr = record.date.toISOString().split('T')[0];
      if (!dailyBreakdown[dateStr]) {
        dailyBreakdown[dateStr] = {};
        for (const ft of FEED_TYPES) {
          dailyBreakdown[dateStr][ft] = 0;
        }
      }

      for (const ft of FEED_TYPES) {
        const val = (record as any)[ft];
        if (val && typeof val === 'number') {
          dailyBreakdown[dateStr][ft] += val;
        }
      }
    }

    // Round daily values
    for (const dateStr of Object.keys(dailyBreakdown)) {
      for (const ft of FEED_TYPES) {
        dailyBreakdown[dateStr][ft] = Math.round(dailyBreakdown[dateStr][ft] * 100) / 100;
      }
    }

    // === Total Consumption ===
    const totalConsumption: Record<string, number> = {};
    for (const ft of FEED_TYPES) {
      totalConsumption[ft] = 0;
    }
    for (const record of feedRecords) {
      for (const ft of FEED_TYPES) {
        const val = (record as any)[ft];
        if (val && typeof val === 'number') {
          totalConsumption[ft] += val;
        }
      }
    }
    for (const ft of FEED_TYPES) {
      totalConsumption[ft] = Math.round(totalConsumption[ft] * 100) / 100;
    }

    // === Inventory data for the period ===
    const startMonth = fromMonth;
    const startYear = fromYear;
    const endMonth2 = toMonth;
    const endYear2 = toYear;

    const inventoryRecords = await prisma.feedInventory.findMany({
      where: {
        OR: getMonthYearRange(startYear, startMonth, endYear2, endMonth2),
      },
      orderBy: [{ year: 'asc' }, { month: 'asc' }],
    });

    // If format=csv, return CSV data
    if (format === 'csv') {
      const csvRows: string[] = [];

      // Header
      csvRows.push(['Horse', 'Stable No', 'Days Recorded', ...FEED_TYPES.map(f => FEED_LABELS[f])].join(','));

      // Horse consumption rows
      for (const horseId of Object.keys(horseConsumption)) {
        const hc = horseConsumption[horseId];
        csvRows.push(
          [
            `"${hc.horseName}"`,
            `"${hc.stableNumber || ''}"`,
            hc.daysRecorded,
            ...FEED_TYPES.map(ft => hc.feeds[ft]),
          ].join(',')
        );
      }

      // Total row
      csvRows.push(
        ['TOTAL', '', '', ...FEED_TYPES.map(ft => totalConsumption[ft])].join(',')
      );

      // Inventory section header
      csvRows.push('');
      csvRows.push('INVENTORY STATUS');
      csvRows.push(['Feed Type', 'Month/Year', 'Opening Stock', 'Units Brought', 'Total Used', 'Units Left', 'Unit'].join(','));

      for (const inv of inventoryRecords) {
        csvRows.push(
          [
            FEED_LABELS[inv.feedType] || inv.feedType,
            `${inv.month}/${inv.year}`,
            inv.openingStock,
            inv.unitsBrought,
            inv.totalUsed,
            inv.unitsLeft,
            inv.unit,
          ].join(',')
        );
      }

      const csvContent = csvRows.join('\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="feed-consumption-report-${startDate}-to-${endDate}.csv"`);
      return res.status(200).send(csvContent);
    }

    return res.status(200).json({
      success: true,
      data: {
        dateRange: { startDate, endDate },
        totalConsumption,
        horseConsumption,
        dailyBreakdown,
        inventory: inventoryRecords,
        feedTypes: FEED_TYPES,
        feedLabels: FEED_LABELS,
      },
    });
  } catch (error: any) {
    console.error('Error fetching consumption report:', error);
    return res.status(500).json({ error: 'Failed to fetch consumption report' });
  }
}

function getMonthYearRange(startYear: number, startMonth: number, endYear: number, endMonth: number) {
  const conditions: any[] = [];
  let y = startYear;
  let m = startMonth;

  while (y < endYear || (y === endYear && m <= endMonth)) {
    conditions.push({ month: m, year: y });
    m++;
    if (m > 12) {
      m = 1;
      y++;
    }
  }

  return conditions;
}
