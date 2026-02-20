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
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
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
    let { employeeId, date, status, remarks } = req.body;

    // Check if marking for Monday and auto-set status to WOFF
    const markingDate = new Date(date);
    const dayOfMarkingDate = markingDate.getDay(); // 0 = Sunday, 1 = Monday
    if (dayOfMarkingDate === 1) {
      // Marking for Monday - always set to WOFF (weekly off)
      status = 'WOFF';
    }

    if (!employeeId || !date || !status) {
      return res.status(400).json({ error: 'Employee ID, date, and status are required' });
    }

    // Validate status
    const validStatuses = ['Present', 'Absent', 'Leave', 'WOFF', 'Half Day'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid attendance status' });
    }

    // Verify that the employee exists and supervisor can mark their attendance
    const supervisor = await prisma.employee.findUnique({
      where: { id: supervisorId },
      select: { designation: true, department: true }
    });

    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
      select: { designation: true, department: true }
    });

    if (!employee) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    // Check if supervisor can mark this employee's attendance based on role
    const SUPERVISOR_ROLES = ['Super Admin', 'Stable Manager', 'Ground Supervisor'];
    
    if (!supervisor || !SUPERVISOR_ROLES.includes(supervisor.designation)) {
      return res.status(403).json({ error: 'Only supervisors can mark attendance' });
    }
    // Stable Manager can mark Stable Operations staff
    if (supervisor.designation === 'Stable Manager') {
      if (employee.department !== 'Stable Operations' || ['Super Admin', 'Director', 'School Administrator', 'Stable Manager'].includes(employee.designation)) {
        return res.status(403).json({ error: 'You can only mark attendance for non-supervisor staff in your department' });
      }
    }
    // Ground Supervisor can mark Ground Operations staff
    else if (supervisor.designation === 'Ground Supervisor') {
      if (employee.department !== 'Ground Operations' || employee.designation === 'Ground Supervisor') {
        return res.status(403).json({ error: 'You can only mark attendance for non-supervisor staff in your department' });
      }
    }
    // Admin roles can mark anyone except other admin roles
    else if (!['Super Admin', 'Director', 'School Administrator'].includes(supervisor.designation)) {
      return res.status(403).json({ error: 'Invalid supervisor role' });
    } else if (['Super Admin', 'Director', 'School Administrator'].includes(employee.designation)) {
      return res.status(403).json({ error: 'You cannot mark attendance for other administrators' });
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
    const now = new Date();
    if (existingRecord) {
      // Update existing record
      record = await prisma.attendance.update({
        where: { id: existingRecord.id },
        data: {
          status,
          remarks,
          markedAt: now, // Record when attendance was marked
          updatedAt: now
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
          remarks,
          markedAt: now // Record when attendance was marked
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

