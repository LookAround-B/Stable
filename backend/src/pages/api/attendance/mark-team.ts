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

  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: 'Method not allowed' });
  }

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

  const supervisorId = decoded?.id;

  try {
    const { employeeId, date, status, remarks } = req.body;

    if (!employeeId || !date || !status) {
      return res.status(400).json({ error: 'Employee ID, date, and status are required' });
    }

    // Validate status
    const validStatuses = ['Present', 'Absent', 'Leave', 'WOFF', 'Half Day'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid attendance status' });
    }

    // Verify that the employee is under this supervisor
    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
      select: { supervisorId: true }
    });

    if (!employee || employee.supervisorId !== supervisorId) {
      return res.status(403).json({ error: 'You can only mark attendance for your team members' });
    }

    // Parse date
    const attendanceDate = new Date(date);
    attendanceDate.setHours(0, 0, 0, 0);

    // Check if attendance record already exists
    const existingRecord = await prisma.attendance.findFirst({
      where: {
        employeeId: employeeId,
        date: {
          gte: attendanceDate,
          lt: new Date(attendanceDate.getTime() + 24 * 60 * 60 * 1000)
        }
      }
    });

    let record;
    if (existingRecord) {
      // Update existing record
      record = await prisma.attendance.update({
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
              designation: true
            }
          }
        }
      });
    } else {
      // Create new record
      record = await prisma.attendance.create({
        data: {
          employeeId,
          date: attendanceDate,
          status,
          remarks
        },
        include: {
          employee: {
            select: {
              id: true,
              fullName: true,
              designation: true
            }
          }
        }
      });
    }

    return res.status(201).json({ message: 'Attendance marked', record });
  } catch (error) {
    console.error('Error marking team attendance:', error);
    return res.status(500).json({ error: 'Failed to mark attendance' });
  }
}

export default handler;
