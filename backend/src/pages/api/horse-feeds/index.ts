import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '../../../lib/prisma';
import { verifyToken } from '../../../lib/auth';
import { handleCorsAndPreflight } from '../../../lib/cors';

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (handleCorsAndPreflight(req, res)) return;
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
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

    // Get full user data from database
    const user = await prisma.employee.findUnique({
      where: { id: decoded.id },
      select: {
        id: true,
        email: true,
        designation: true,
        fullName: true,
      },
    });

    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    if (req.method === 'GET') {
      // Get horse feed records
      const { startDate, endDate, horseId } = req.query;

      // Only Stable Manager and Ground Supervisor can view
      if (!['Stable Manager', 'Ground Supervisor', 'Super Admin', 'Director', 'School Administrator'].includes(user.designation)) {
        return res.status(403).json({ error: 'You do not have permission to view horse feeds' });
      }

      let where: any = {};

      // Filter by horse if specified
      if (horseId) {
        where.horseId = horseId as string;
      }

      // Filter by date range
      if (startDate || endDate) {
        where.date = {};
        if (startDate) {
          const [year, month, day] = (startDate as string).split('-').map(Number);
          const startDateObj = new Date(Date.UTC(year, month - 1, day, 0, 0, 0));
          console.log(`[Horse Feeds GET] startDate: ${startDate}, parsed: UTC: ${startDateObj.toISOString()}`);
          where.date.gte = startDateObj;
        }
        if (endDate) {
          const [year, month, day] = (endDate as string).split('-').map(Number);
          const endDateObj = new Date(Date.UTC(year, month - 1, day + 1, 0, 0, 0));
          console.log(`[Horse Feeds GET] endDate: ${endDate}, next day UTC: ${endDateObj.toISOString()}`);
          where.date.lt = endDateObj;
        }
      }

      const records = await prisma.horseFeed.findMany({
        where,
        include: {
          horse: {
            select: {
              id: true,
              name: true,
            },
          },
          recordedBy: {
            select: {
              id: true,
              fullName: true,
            },
          },
        },
        orderBy: { date: 'desc' },
      });

      return res.status(200).json({
        data: records,
        message: 'Horse feed records retrieved',
      });
    } else if (req.method === 'POST') {
      // Create horse feed record - only Stable Manager and Ground Supervisor
      if (!['Stable Manager', 'Ground Supervisor', 'Super Admin', 'Director', 'School Administrator'].includes(user.designation)) {
        return res.status(403).json({ error: 'Only Stable Manager and Ground Supervisor can record horse feeds' });
      }

      const { horseId, date, balance, barley, oats, soya, lucerne, linseed, rOil, biotin, joint, epsom, heylase, notes } = req.body;

      if (!horseId || !date) {
        return res.status(400).json({ error: 'Horse ID and date are required' });
      }

      // Validate horse exists
      const horse = await prisma.horse.findUnique({
        where: { id: horseId },
      });

      if (!horse) {
        return res.status(404).json({ error: 'Horse not found' });
      }

      // Parse date
      const [year, month, day] = (date as string).split('-').map(Number);
      const recordDate = new Date(Date.UTC(year, month - 1, day, 0, 0, 0));

      // Check if record already exists for this horse and date
      const existingRecord = await prisma.horseFeed.findUnique({
        where: {
          horseId_date: {
            horseId,
            date: recordDate,
          },
        },
      });

      if (existingRecord) {
        return res.status(400).json({ error: 'A feed record already exists for this horse on this date' });
      }

      const record = await prisma.horseFeed.create({
        data: {
          recordedById: user.id,
          horseId,
          date: recordDate,
          balance: balance ? parseFloat(balance) : null,
          barley: barley ? parseFloat(barley) : null,
          oats: oats ? parseFloat(oats) : null,
          soya: soya ? parseFloat(soya) : null,
          lucerne: lucerne ? parseFloat(lucerne) : null,
          linseed: linseed ? parseFloat(linseed) : null,
          rOil: rOil ? parseFloat(rOil) : null,
          biotin: biotin ? parseFloat(biotin) : null,
          joint: joint ? parseFloat(joint) : null,
          epsom: epsom ? parseFloat(epsom) : null,
          heylase: heylase ? parseFloat(heylase) : null,
          notes,
        },
        include: {
          horse: {
            select: {
              id: true,
              name: true,
            },
          },
          recordedBy: {
            select: {
              id: true,
              fullName: true,
            },
          },
        },
      });

      console.log('[Horse Feeds POST] Record created:', JSON.stringify(record, null, 2));

      return res.status(201).json({
        data: record,
        message: 'Horse feed record created successfully',
      });
    } else {
      res.setHeader('Allow', ['GET', 'POST']);
      return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error: any) {
    console.error('Horse feeds API error:', error);
    return res.status(500).json({ error: 'Internal server error', message: String(error) });
  }
}

export default handler;

