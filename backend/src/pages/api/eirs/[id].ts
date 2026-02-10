import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '../../../../lib/prisma';
import { verifyAuth } from '../../../../lib/auth';
import cors from 'cors';
import { runMiddleware } from '../../../../lib/cors';

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

    const { id } = req.query;

    if (!id || typeof id !== 'string') {
      return res.status(400).json({ error: 'Invalid record ID' });
    }

    // Get the record
    const record = await prisma.instructorDailyWorkRecord.findUnique({
      where: { id },
    });

    if (!record) {
      return res.status(404).json({ error: 'Record not found' });
    }

    // Only the instructor who created it can edit/delete (unless admin)
    if (record.instructorId !== user.id && !['Super Admin', 'Director', 'School Administrator'].includes(user.designation)) {
      return res.status(403).json({ error: 'You can only edit or delete your own records' });
    }

    if (req.method === 'PUT') {
      // Update record
      const { horseId, riderId, workType, duration, date, notes } = req.body;

      // Validate horse if provided
      if (horseId) {
        const horse = await prisma.horse.findUnique({
          where: { id: horseId },
        });
        if (!horse) {
          return res.status(404).json({ error: 'Horse not found' });
        }
      }

      // Validate rider if provided
      if (riderId) {
        const rider = await prisma.employee.findUnique({
          where: { id: riderId },
        });
        if (!rider) {
          return res.status(404).json({ error: 'Rider/Student not found' });
        }
      }

      const updateData: any = {};
      if (horseId) updateData.horseId = horseId;
      if (riderId) updateData.riderId = riderId;
      if (workType) updateData.workType = workType;
      if (duration) updateData.duration = parseInt(duration);
      if (date) {
        const recordDate = new Date(date);
        recordDate.setHours(0, 0, 0, 0);
        updateData.date = recordDate;
      }
      if (notes !== undefined) updateData.notes = notes;

      const updatedRecord = await prisma.instructorDailyWorkRecord.update({
        where: { id },
        data: updateData,
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

      return res.status(200).json({
        data: updatedRecord,
        message: 'Record updated successfully',
      });
    } else if (req.method === 'DELETE') {
      // Delete record
      await prisma.instructorDailyWorkRecord.delete({
        where: { id },
      });

      return res.status(200).json({
        message: 'Record deleted successfully',
      });
    } else {
      res.setHeader('Allow', ['PUT', 'DELETE']);
      return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error: any) {
    console.error('EIRS record API error:', error);
    if (error.code === 'P2002') {
      return res.status(400).json({ error: 'A record already exists for this instructor, horse, rider, and date combination' });
    }
    return res.status(500).json({ error: 'Internal server error', message: String(error) });
  }
}

export default handler;
