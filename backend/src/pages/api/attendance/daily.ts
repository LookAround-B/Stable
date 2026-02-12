import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '../../../lib/prisma';
import { verifyToken } from '../../../lib/auth';

const CORS_ALLOWED_ORIGINS = ['http://localhost:3001', 'http://localhost:3000', 'http://localhost:3002'];

function setCorsHeaders(res: NextApiResponse, origin?: string) {
  if (origin && CORS_ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  } else if (CORS_ALLOWED_ORIGINS.length > 0) {
    res.setHeader('Access-Control-Allow-Origin', CORS_ALLOWED_ORIGINS[0]);
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const origin = req.headers.origin;
  setCorsHeaders(res, origin);

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    // Verify user authorization
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

    // Define allowed roles for viewing daily attendance
    const ALLOWED_ROLES = ['Super Admin', 'Director', 'School Administrator', 'Stable Manager', 'Ground Supervisor'];
    
    if (!ALLOWED_ROLES.includes(user.designation)) {
      return res.status(403).json({ error: 'You do not have permission to access daily attendance records' });
    }

    if (req.method === 'GET') {
      // Get attendance records for a date range
      const { date, employeeId, status, startDate, endDate } = req.query;

      const where: any = {};

      if (employeeId) {
        where.employeeId = employeeId;
      }

      if (status) {
        where.status = status;
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

      const records = await prisma.attendance.findMany({
        where,
        include: {
          employee: {
            select: {
              id: true,
              fullName: true,
              designation: true,
              department: true,
              email: true,
            },
          },
        },
        orderBy: { date: 'desc' },
      });

      return res.status(200).json({
        data: records,
        message: 'Attendance records retrieved',
      });
    } else if (req.method === 'POST') {
      // Create or update attendance record
      const { employeeId, date, checkInTime, checkOutTime, status, remarks } = req.body;

      if (!employeeId || !date || !status) {
        return res.status(400).json({ message: 'Missing required fields: employeeId, date, status' });
      }

      const attendanceDate = new Date(date);
      attendanceDate.setHours(0, 0, 0, 0);

      // Check if record exists for this employee on this date
      const existing = await prisma.attendance.findUnique({
        where: {
          employeeId_date: {
            employeeId,
            date: attendanceDate,
          },
        },
      });

      let record;
      if (existing) {
        // Update existing record
        record = await prisma.attendance.update({
          where: { id: existing.id },
          data: {
            checkInTime: checkInTime ? new Date(checkInTime) : existing.checkInTime,
            checkOutTime: checkOutTime ? new Date(checkOutTime) : existing.checkOutTime,
            status,
            remarks: remarks || existing.remarks,
            updatedAt: new Date(),
          },
          include: {
            employee: {
              select: {
                id: true,
                fullName: true,
                designation: true,
                department: true,
              },
            },
          },
        });
      } else {
        // Create new record
        record = await prisma.attendance.create({
          data: {
            employeeId,
            date: attendanceDate,
            checkInTime: checkInTime ? new Date(checkInTime) : null,
            checkOutTime: checkOutTime ? new Date(checkOutTime) : null,
            status,
            remarks,
          },
          include: {
            employee: {
              select: {
                id: true,
                fullName: true,
                designation: true,
                department: true,
              },
            },
          },
        });
      }

      return res.status(201).json({
        message: 'Attendance record saved',
        data: record,
      });
    } else {
      res.setHeader('Allow', ['GET', 'POST']);
      return res.status(405).json({ message: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Attendance API error:', error);
    return res.status(500).json({ message: 'Internal server error', error: String(error) });
  }
}
