import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '../../../lib/prisma';
import { setCorsHeaders } from '../../../lib/cors';


export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  const origin = req.headers.origin;
  setCorsHeaders(res, origin as string | undefined);

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    if (req.method === 'GET') {
      const { groomId, startDate, endDate, type = 'daily' } = req.query;

      if (!groomId) {
        return res.status(400).json({ message: 'groomId is required' });
      }

      let start = startDate ? new Date(startDate as string) : new Date();
      let end = endDate ? new Date(endDate as string) : new Date();

      // Set to beginning and end of day
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);

      // Get worksheets for the period
      const worksheets = await prisma.groomWorkSheet.findMany({
        where: {
          groomId: groomId as string,
          date: {
            gte: start,
            lte: end,
          },
        },
        include: {
          groom: {
            select: {
              id: true,
              fullName: true,
              designation: true,
            },
          },
          entries: {
            include: {
              horse: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
        orderBy: { date: 'asc' },
      });

      // Calculate summary
      let totalAM = 0;
      let totalPM = 0;
      let totalWholeDayHours = 0;
      let totalWoodchips = 0;
      let totalBichali = 0;
      let totalBooSa = 0;

      worksheets.forEach((ws) => {
        totalAM += ws.totalAM;
        totalPM += ws.totalPM;
        totalWholeDayHours += ws.wholeDayHours;
        totalWoodchips += ws.woodchipsUsed;
        totalBichali += ws.bichaliUsed;
        totalBooSa += ws.booSaUsed;
      });

      const summary = {
        period: type === 'daily' ? 'Daily' : 'Weekly',
        startDate: start.toISOString().split('T')[0],
        endDate: end.toISOString().split('T')[0],
        worksheetCount: worksheets.length,
        totalAM,
        totalPM,
        totalWholeDayHours,
        totalWoodchips,
        totalBichali,
        totalBooSa,
      };

      return res.status(200).json({
        data: worksheets,
        summary,
        message: 'Report generated',
      });
    } else {
      res.setHeader('Allow', ['GET']);
      return res.status(405).json({ message: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Groom Report API error:', error);
    return res.status(500).json({ message: 'Internal server error', error: String(error) });
  }
}

