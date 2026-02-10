import { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';
import { runMiddleware } from '../../../lib/cors';
import cors from 'cors';

const prisma = new PrismaClient();

const corsMiddleware = cors({
  origin: ['http://localhost:3001', 'http://localhost:3002', 'http://localhost:3000'],
  credentials: true,
});

async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Apply CORS middleware
  await runMiddleware(req, res, corsMiddleware);

  // Verify JWT token
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) {
    return res.status(401).json({ error: 'Unauthorized - No token' });
  }

  let decoded: any;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
  } catch (err) {
    return res.status(401).json({ error: 'Unauthorized - Invalid token' });
  }

  const userId = decoded?.id;

  if (req.method === 'POST') {
    return handleCreateAttendance(req, res, userId);
  } else if (req.method === 'GET') {
    return handleGetAttendance(req, res, userId);
  } else {
    res.setHeader('Allow', ['GET', 'POST']);
    return res.status(405).json({ error: 'Method not allowed' });
  }
}

async function handleCreateAttendance(req: NextApiRequest, res: NextApiResponse, userId: string) {
  try {
    const { date, status, remarks } = req.body;

    if (!date || !status) {
      return res.status(400).json({ error: 'Date and status are required' });
    }

    // Validate status
    const validStatuses = ['Present', 'Absent', 'Leave', 'WOFF', 'Half Day'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid attendance status' });
    }

    // Parse date
    const attendanceDate = new Date(date);
    attendanceDate.setHours(0, 0, 0, 0);

    // Check if attendance record already exists for this date
    const existingRecord = await prisma.attendance.findFirst({
      where: {
        employeeId: userId,
        date: {
          gte: attendanceDate,
          lt: new Date(attendanceDate.getTime() + 24 * 60 * 60 * 1000)
        }
      }
    });

    if (existingRecord) {
      // Update existing record
      const updated = await prisma.attendance.update({
        where: { id: existingRecord.id },
        data: {
          status,
          remarks,
          updatedAt: new Date()
        },
        include: {
          employee: {
            select: {
              id: true,
              fullName: true,
              designation: true,
              email: true
            }
          }
        }
      });
      return res.status(200).json({ message: 'Attendance updated', record: updated });
    }

    // Create new record with check-in time set to current time if status is Present
    const record = await prisma.attendance.create({
      data: {
        employeeId: userId,
        date: attendanceDate,
        status,
        remarks,
        checkInTime: status === 'Present' ? new Date() : null
      },
      include: {
        employee: {
          select: {
            id: true,
            fullName: true,
            designation: true,
            email: true
          }
        }
      }
    });

    return res.status(201).json({ message: 'Attendance recorded', record });
  } catch (error) {
    console.error('Error creating attendance:', error);
    return res.status(500).json({ error: 'Failed to record attendance' });
  }
}

async function handleGetAttendance(req: NextApiRequest, res: NextApiResponse, userId: string) {
  try {
    const { date } = req.query;

    // Parse date if provided
    let startDate: Date | null = null;
    let endDate: Date | null = null;

    if (date) {
      startDate = new Date(date as string);
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + 1);
    }

    // Get personal attendance records
    const records = await prisma.attendance.findMany({
      where: {
        employeeId: userId,
        ...(startDate && endDate && {
          date: {
            gte: startDate,
            lt: endDate
          }
        })
      },
      orderBy: {
        date: 'desc'
      },
      take: 100
    });

    return res.status(200).json({ records });
  } catch (error) {
    console.error('Error getting attendance:', error);
    return res.status(500).json({ error: 'Failed to fetch attendance records' });
  }
}

export default handler;
