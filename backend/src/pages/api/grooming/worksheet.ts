import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '../../../lib/prisma';
import { setCorsHeaders } from '../../../lib/cors';


export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const origin = req.headers.origin;
  setCorsHeaders(res, origin as string | undefined);

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    if (req.method === 'GET') {
      // Get groom worksheets
      const { groomId, date, startDate, endDate } = req.query;

      const where: any = {};

      if (groomId) {
        where.groomId = groomId;
      }

      if (date) {
        const dateObj = new Date(date as string);
        where.date = {
          gte: new Date(dateObj.getFullYear(), dateObj.getMonth(), dateObj.getDate()),
          lt: new Date(dateObj.getFullYear(), dateObj.getMonth(), dateObj.getDate() + 1),
        };
      }

      if (startDate || endDate) {
        where.date = where.date || {};
        if (startDate) {
          where.date.gte = new Date(startDate as string);
        }
        if (endDate) {
          where.date.lt = new Date(new Date(endDate as string).getTime() + 86400000);
        }
      }

      const worksheets = await prisma.groomWorkSheet.findMany({
        where,
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
        orderBy: { date: 'desc' },
      });

      return res.status(200).json({
        data: worksheets,
        message: 'Groom worksheets retrieved',
      });
    } else if (req.method === 'POST') {
      // Create groom worksheet
      const { groomId, date, entries, remarks } = req.body;

      if (!groomId || !date || !Array.isArray(entries)) {
        return res.status(400).json({ message: 'Missing required fields: groomId, date, entries' });
      }

      const worksheetDate = new Date(date);
      worksheetDate.setHours(0, 0, 0, 0);

      // Calculate totals
      let totalAM = 0;
      let totalPM = 0;
      let totalWholeDayHours = 0;
      let totalWoodchips = 0;
      let totalBichali = 0;
      let totalBooSa = 0;

      entries.forEach((entry: any) => {
        totalAM += entry.amHours || 0;
        totalPM += entry.pmHours || 0;
        totalWholeDayHours += entry.wholeDayHours || 0;
        totalWoodchips += entry.woodchipsUsed || 0;
        totalBichali += entry.bichaliUsed || 0;
        totalBooSa += entry.booSaUsed || 0;
      });

      // Create worksheet with entries
      const worksheet = await prisma.groomWorkSheet.create({
        data: {
          groomId,
          date: worksheetDate,
          totalAM,
          totalPM,
          wholeDayHours: totalWholeDayHours,
          woodchipsUsed: totalWoodchips,
          bichaliUsed: totalBichali,
          booSaUsed: totalBooSa,
          remarks,
          entries: {
            create: entries.map((entry: any) => ({
              horseId: entry.horseId,
              amHours: entry.amHours || 0,
              pmHours: entry.pmHours || 0,
              wholeDayHours: entry.wholeDayHours || 0,
              woodchipsUsed: entry.woodchipsUsed || 0,
              bichaliUsed: entry.bichaliUsed || 0,
              booSaUsed: entry.booSaUsed || 0,
              remarks: entry.remarks,
            })),
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
      });

      return res.status(201).json({
        message: 'Groom worksheet created',
        data: worksheet,
      });
    } else {
      res.setHeader('Allow', ['GET', 'POST']);
      return res.status(405).json({ message: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Groom Worksheet API error:', error);
    return res.status(500).json({ message: 'Internal server error', error: String(error) });
  }
}

