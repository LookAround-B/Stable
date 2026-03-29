import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '../../../lib/prisma';
import { verifyToken } from '../../../lib/auth';
import { setCorsHeaders } from '@/lib/cors'
import { sanitizeString, isValidString, isValidId, isOneOf, safeDate } from '@/lib/validate'

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const origin = req.headers.origin
  setCorsHeaders(res, origin as string | undefined)

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
      // Get EIRS records
      const { startDate, endDate, instructorId } = req.query;

      let where: any = {};

      // Instructors can only see their own records (records they created)
      if (user.designation === 'Instructor') {
        where.instructorId = user.id;
      }
      // Riding Boys, Riders, Grooms see records where they are the rider
      else if (['Riding Boy', 'Rider', 'Groom'].includes(user.designation)) {
        where.riderId = user.id;
      }
      // Stable Manager, admins can see all
      else if (user.designation !== 'Stable Manager' && !['Super Admin', 'Director', 'School Administrator'].includes(user.designation)) {
        return res.status(403).json({ error: 'You do not have permission to view EIRS records' });
      }

      // Filter by specific instructor if queried
      if (instructorId && (user.designation === 'Stable Manager' || ['Super Admin', 'Director', 'School Administrator'].includes(user.designation))) {
        where.instructorId = instructorId as string;
      }

      // Filter by date range
      if (startDate || endDate) {
        where.date = {};
        if (startDate) {
          // Parse date string as YYYY-MM-DD and create a Date at start of day UTC
          const [year, month, day] = (startDate as string).split('-').map(Number);
          const startDateObj = new Date(Date.UTC(year, month - 1, day, 0, 0, 0));
          console.log(`[EIRS GET] startDate: ${startDate}, parsed: year=${year} month=${month} day=${day}, UTC: ${startDateObj.toISOString()}`);
          where.date.gte = startDateObj;
        }
        if (endDate) {
          // Parse date string as YYYY-MM-DD and create a Date at START of NEXT day UTC (exclusive end)
          const [year, month, day] = (endDate as string).split('-').map(Number);
          const endDateObj = new Date(Date.UTC(year, month - 1, day + 1, 0, 0, 0)); // Add 1 to day to get next day
          console.log(`[EIRS GET] endDate: ${endDate}, parsed: year=${year} month=${month} day=${day}, next day UTC: ${endDateObj.toISOString()}`);
          where.date.lt = endDateObj; // Use lt (less than) for exclusive upper bound
        }
      }

      console.log('[EIRS GET] Final where clause:', JSON.stringify(where, null, 2));

      const records = await prisma.instructorDailyWorkRecord.findMany({
        where,
        include: {
          instructor: {
            select: {
              id: true,
              fullName: true,
              designation: true,
            },
          },
          horse: {
            select: {
              id: true,
              name: true,
            },
          },
          rider: {
            select: {
              id: true,
              fullName: true,
              designation: true,
            },
          },
        },
        orderBy: { date: 'desc' },
      });

      return res.status(200).json({
        data: records,
        message: 'EIRS records retrieved',
      });
    } else if (req.method === 'POST') {
      // Create EIRS record - only Instructors can create
      if (user.designation !== 'Instructor') {
        return res.status(403).json({ error: 'Only Instructors can create daily work records' });
      }

      const { horseId, riderId, workType, duration, date, notes } = req.body;

      if (!isValidId(horseId)) {
        return res.status(400).json({ error: 'Valid horseId is required' });
      }
      if (!isValidId(riderId)) {
        return res.status(400).json({ error: 'Valid riderId is required' });
      }
      const WORK_TYPES = ['Flat Work', 'Jumping', 'Lunging', 'Hacking', 'Dressage', 'Cross Country', 'Pole Work', 'Walk', 'Other'] as const;
      if (!isOneOf(workType, WORK_TYPES)) {
        return res.status(400).json({ error: `Invalid workType. Must be one of: ${WORK_TYPES.join(', ')}` });
      }
      const dur = parseInt(duration);
      if (isNaN(dur) || dur < 1 || dur > 480) {
        return res.status(400).json({ error: 'Duration must be between 1 and 480 minutes' });
      }
      const recordDateParsed = safeDate(date);
      if (!recordDateParsed) {
        return res.status(400).json({ error: 'Valid date is required' });
      }
      if (notes && !isValidString(notes, 0, 1000)) {
        return res.status(400).json({ error: 'Notes must be max 1000 characters' });
      }

      // Validate horse exists
      const horse = await prisma.horse.findUnique({
        where: { id: horseId },
      });

      if (!horse) {
        return res.status(404).json({ error: 'Horse not found' });
      }

      // Validate rider/student exists
      const rider = await prisma.employee.findUnique({
        where: { id: riderId },
      });

      if (!rider) {
        return res.status(404).json({ error: 'Rider/Student not found' });
      }

      // Parse date string as YYYY-MM-DD and create a Date at start of day UTC
      const [year, month, day] = (date as string).split('-').map(Number);
      const recordDate = new Date(Date.UTC(year, month - 1, day, 0, 0, 0));

      const record = await prisma.instructorDailyWorkRecord.create({
        data: {
          instructorId: user.id,
          horseId,
          riderId,
          workType,
          duration: dur,
          date: recordDate,
          notes: notes ? sanitizeString(notes) : null,
        },
        include: {
          instructor: {
            select: {
              id: true,
              fullName: true,
            },
          },
          horse: {
            select: {
              id: true,
              name: true,
            },
          },
          rider: {
            select: {
              id: true,
              fullName: true,
            },
          },
        },
      });

      return res.status(201).json({
        data: record,
        message: 'Daily work record created successfully',
      });
    } else {
      res.setHeader('Allow', ['GET', 'POST']);
      return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error: any) {
    console.error('EIRS API error:', error);
    if (error.code === 'P2002') {
      return res.status(400).json({ error: 'A record already exists for this instructor, horse, rider, and date combination' });
    }
    return res.status(500).json({ error: 'Internal server error' });
  }
}

export default handler;

