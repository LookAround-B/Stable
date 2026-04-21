import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '../../../lib/prisma';
import { verifyToken } from '../../../lib/auth';
import { setCorsHeaders } from '@/lib/cors'
import { sanitizeString, isValidString, isValidId, safeDate } from '@/lib/validate'
import {
  EIRS_VALID_WORK_TYPES,
  isValidEirsWorkType,
  workTypeRequiresDuration,
  workTypeRequiresNotes,
  normalizeEirsWorkType,
  workTypeRequiresRider,
} from '@/lib/eirs'

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

    const { id } = req.query;

    if (!id || typeof id !== 'string' || !isValidId(id)) {
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
      const normalizedWorkType = workType !== undefined ? normalizeEirsWorkType(workType) : record.workType;
      const riderRequired = workTypeRequiresRider(normalizedWorkType);
      const durationRequired = workTypeRequiresDuration(normalizedWorkType);
      const notesRequired = workTypeRequiresNotes(normalizedWorkType);
      let nextRiderId = record.riderId;

      // Validate fields
      if (horseId && !isValidId(horseId)) {
        return res.status(400).json({ error: 'Invalid horseId' });
      }
      if (workType !== undefined && !isValidEirsWorkType(normalizedWorkType)) {
        return res.status(400).json({ error: `Invalid workType. Must be one of: ${EIRS_VALID_WORK_TYPES.join(', ')}` });
      }
      if (riderId !== undefined && riderId !== null && riderId !== '' && !isValidId(riderId)) {
        return res.status(400).json({ error: 'Invalid riderId' });
      }
      if (durationRequired && duration !== undefined) {
        const dur = parseInt(duration);
        if (isNaN(dur) || dur < 1 || dur > 480) {
          return res.status(400).json({ error: 'Duration must be 1-480 minutes' });
        }
      }
      if (date && !safeDate(date)) {
        return res.status(400).json({ error: 'Invalid date' });
      }
      if (notes !== undefined && notes && !isValidString(notes, 0, 1000)) {
        return res.status(400).json({ error: 'Notes must be max 1000 chars' });
      }

      if (!riderRequired) {
        nextRiderId = null;
      }

      if (riderId !== undefined) {
        nextRiderId = riderRequired ? (riderId ? riderId : null) : null;
      }

      if (riderRequired && !nextRiderId) {
        return res.status(400).json({ error: 'Valid riderId is required for riding sessions' });
      }

      const nextNotes =
        notes !== undefined ? (notes ? sanitizeString(notes) : null) : record.notes;
      if (notesRequired && !isValidString(nextNotes, 1, 1000)) {
        return res.status(400).json({ error: 'Notes are required for rest and lame entries' });
      }

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
      if (nextRiderId) {
        const rider = await prisma.employee.findUnique({
          where: { id: nextRiderId },
        });
        if (!rider) {
          return res.status(404).json({ error: 'Rider/Student not found' });
        }
      }

      let nextDate = record.date;
      if (date) {
        nextDate = safeDate(date) as Date;
      }

      const nextHorseId = horseId || record.horseId;
      const conflictingRecord = await prisma.instructorDailyWorkRecord.findFirst({
        where: {
          id: { not: id },
          instructorId: record.instructorId,
          horseId: nextHorseId,
          riderId: nextRiderId,
          date: nextDate,
        },
        select: { id: true },
      });

      if (conflictingRecord) {
        return res.status(400).json({ error: 'A record already exists for this instructor, horse, rider, and date combination' });
      }

      const updateData: any = {};
      if (horseId) updateData.horseId = horseId;
      if (workType !== undefined || riderId !== undefined) updateData.riderId = nextRiderId;
      if (workType) updateData.workType = normalizedWorkType;
      if (durationRequired) {
        if (duration !== undefined) updateData.duration = parseInt(duration);
      } else {
        updateData.duration = 0;
      }
      if (date) {
        // Parse date string as YYYY-MM-DD and create a Date at start of day UTC (same as POST handler)
        console.log(`[EIRS PUT] Updating date: ${date} to UTC: ${nextDate.toISOString()}`);
        updateData.date = nextDate;
      }
      if (notes !== undefined) updateData.notes = nextNotes;

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

      console.log('[EIRS PUT] Record updated:', JSON.stringify(updatedRecord, null, 2));

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
    return res.status(500).json({ error: 'Internal server error' });
  }
}

export default handler;
