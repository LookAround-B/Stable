import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '../../../lib/prisma';
import { verifyAuth } from '../../../lib/auth';
import cors from 'cors';
import { runMiddleware } from '../../../lib/cors';

const corsMiddleware = cors({
  origin: ['http://localhost:3001', 'http://localhost:3002', 'http://localhost:3000'],
  credentials: true,
});

async function handler(req: NextApiRequest, res: NextApiResponse) {
  await runMiddleware(req, res, corsMiddleware);

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
    const user = await verifyAuth(token);

    if (!user) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    if (req.method === 'GET') {
      // Get EIRS records
      const { startDate, endDate, instructorId } = req.query;

      let where: any = {};

      // Instructors can only see their own records
      if (user.designation === 'Instructor') {
        where.instructorId = user.id;
      }
      // Stable Manager can see all
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
          where.date.gte = new Date(startDate as string);
        }
        if (endDate) {
          const endDateObj = new Date(endDate as string);
          endDateObj.setHours(23, 59, 59, 999);
          where.date.lte = endDateObj;
        }
      }

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

      if (!horseId || !riderId || !workType || !duration || !date) {
        return res.status(400).json({ error: 'Missing required fields: horseId, riderId, workType, duration, date' });
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

      const recordDate = new Date(date);
      recordDate.setHours(0, 0, 0, 0);

      const record = await prisma.instructorDailyWorkRecord.create({
        data: {
          instructorId: user.id,
          horseId,
          riderId,
          workType,
          duration: parseInt(duration),
          date: recordDate,
          notes,
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
    return res.status(500).json({ error: 'Internal server error', message: String(error) });
  }
}

export default handler;
