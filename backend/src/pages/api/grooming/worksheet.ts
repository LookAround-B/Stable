import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '../../../lib/prisma';
import { setCorsHeaders } from '../../../lib/cors';
import { getTokenFromRequest, verifyToken } from '@/lib/auth';
import {
  sanitizeString,
  isValidId,
  isValidString,
  safeDate,
  safePositiveInt,
  validationError,
} from '@/lib/validate';


export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const origin = req.headers.origin;
  setCorsHeaders(res, origin as string | undefined);

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Authenticate all requests
  const token = getTokenFromRequest(req as any);
  if (!token) {
    return res.status(401).json({ error: 'No authorization header' });
  }
  const decoded = verifyToken(token);
  if (!decoded) {
    return res.status(401).json({ error: 'Invalid or expired token' });
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

      if (!date || !Array.isArray(entries)) {
        return validationError(res, 'Missing required fields: date, entries');
      }

      // Validate groomId if provided
      if (groomId && !isValidId(groomId)) {
        return validationError(res, 'Invalid groomId format');
      }

      // Validate date
      const worksheetDate = safeDate(date);
      if (!worksheetDate) {
        return validationError(res, 'Invalid date format');
      }
      worksheetDate.setHours(0, 0, 0, 0);

      // Validate entries array (max 100 entries)
      if (entries.length > 100) {
        return validationError(res, 'Too many entries (max 100)');
      }

      // Validate remarks
      if (remarks && !isValidString(remarks, 0, 1000)) {
        return validationError(res, 'Remarks must be under 1000 characters');
      }

      // Validate each entry
      for (const entry of entries) {
        if (entry.horseId && !isValidId(entry.horseId)) {
          return validationError(res, 'Invalid horseId in entry');
        }
        if (typeof entry.amHours === 'number' && (entry.amHours < 0 || entry.amHours > 24)) {
          return validationError(res, 'amHours must be between 0 and 24');
        }
        if (typeof entry.pmHours === 'number' && (entry.pmHours < 0 || entry.pmHours > 24)) {
          return validationError(res, 'pmHours must be between 0 and 24');
        }
      }

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
          groomId: groomId || null,
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
              horseId: entry.horseId || null,
              amHours: safePositiveInt(entry.amHours, 0, 24),
              pmHours: safePositiveInt(entry.pmHours, 0, 24),
              wholeDayHours: safePositiveInt(entry.wholeDayHours, 0, 24),
              woodchipsUsed: safePositiveInt(entry.woodchipsUsed, 0, 10000),
              bichaliUsed: safePositiveInt(entry.bichaliUsed, 0, 10000),
              booSaUsed: safePositiveInt(entry.booSaUsed, 0, 10000),
              remarks: entry.remarks ? sanitizeString(entry.remarks).slice(0, 500) : undefined,
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
    return res.status(500).json({ message: 'Internal server error' });
  }
}

