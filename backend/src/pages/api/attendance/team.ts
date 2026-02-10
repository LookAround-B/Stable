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

const SUPERVISOR_ROLES = [
  'Super Admin',
  'Director',
  'School Administrator',
  'Ground Supervisor',
  'Stable Manager',
  'Jamedar'
];

async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Apply CORS middleware
  await runMiddleware(req, res, corsMiddleware);

  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
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

  const userId = decoded?.id;

  try {
    // Check if user is a supervisor
    const user = await prisma.employee.findUnique({
      where: { id: userId },
      select: { designation: true, id: true }
    });

    if (!user || !SUPERVISOR_ROLES.includes(user.designation)) {
      return res.status(403).json({ error: 'Only supervisors can view team attendance' });
    }

    const { date } = req.query;

    // Parse date
    let dateFilter: any = {};
    if (date) {
      const startDate = new Date(date as string);
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + 1);

      dateFilter = {
        date: {
          gte: startDate,
          lt: endDate
        }
      };
    } else {
      // Default to today
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      dateFilter = {
        date: {
          gte: today,
          lt: tomorrow
        }
      };
    }

    // Get team based on user role
    let teamMembers: any[] = [];

    if (user.designation === 'Ground Supervisor') {
      // Get all ground operations staff except supervisors
      teamMembers = await prisma.employee.findMany({
        where: {
          department: 'Ground Operations',
          designation: { not: 'Ground Supervisor' }
        },
        select: { id: true, fullName: true, designation: true }
      });
    } else if (user.designation === 'Stable Manager') {
      // Get all stable operations staff except supervisors
      teamMembers = await prisma.employee.findMany({
        where: {
          department: 'Stable Operations',
          designation: {
            notIn: ['Super Admin', 'Director', 'School Administrator', 'Stable Manager']
          }
        },
        select: { id: true, fullName: true, designation: true }
      });
    } else if (user.designation === 'Jamedar') {
      // Get all staff in Stable Operations except supervisors
      teamMembers = await prisma.employee.findMany({
        where: {
          department: 'Stable Operations',
          designation: {
            notIn: ['Super Admin', 'Director', 'School Administrator', 'Stable Manager', 'Jamedar']
          }
        },
        select: { id: true, fullName: true, designation: true }
      });
    } else if (['School Administrator', 'Director', 'Super Admin'].includes(user.designation)) {
      // Get all staff except admin roles
      teamMembers = await prisma.employee.findMany({
        where: {
          designation: {
            notIn: ['Super Admin', 'Director', 'School Administrator']
          }
        },
        select: { id: true, fullName: true, designation: true }
      });
    }

    const teamMemberIds = teamMembers.map(m => m.id);

    // Get attendance for team members
    const attendanceRecords = await prisma.attendance.findMany({
      where: {
        employeeId: {
          in: teamMemberIds
        },
        ...dateFilter
      },
      include: {
        employee: {
          select: {
            id: true,
            fullName: true,
            designation: true
          }
        }
      },
      orderBy: {
        date: 'desc'
      }
    });

    // Flatten records for easier consumption on frontend
    const flattenedRecords = attendanceRecords.map(record => ({
      id: record.id,
      employee: record.employee,
      status: record.status,
      remarks: record.remarks,
      date: record.date,
      checkInTime: record.checkInTime,
      checkOutTime: record.checkOutTime
    }));

    return res.status(200).json({
      date: date || new Date().toISOString().split('T')[0],
      teamSize: teamMemberIds.length,
      attendance: flattenedRecords
    });
  } catch (error) {
    console.error('Error getting team attendance:', error);
    return res.status(500).json({ error: 'Failed to fetch team attendance' });
  }
}

export default handler;
