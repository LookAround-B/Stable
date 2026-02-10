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

  // Verify user role
  const user = await prisma.employee.findUnique({
    where: { id: userId },
    select: { designation: true }
  });

  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  // Define supervisor roles who can view gate register
  const SUPERVISOR_ROLES = ['Super Admin', 'Director', 'School Administrator', 'Stable Manager', 'Ground Supervisor'];
  const canView = user.designation === 'Guard' || SUPERVISOR_ROLES.includes(user.designation);
  const canModify = user.designation === 'Guard';

  // Only Guards can create/modify entries
  if (!canView) {
    return res.status(403).json({ error: 'Only Guards and supervisors can access gate register' });
  }

  if (req.method === 'POST') {
    if (!canModify) {
      return res.status(403).json({ error: 'Only Guards can record entries' });
    }
    return handleCreateGateEntry(req, res, userId);
  } else if (req.method === 'GET') {
    return handleGetGateRegister(req, res);
  } else {
    res.setHeader('Allow', ['GET', 'POST']);
    return res.status(405).json({ error: 'Method not allowed' });
  }
}

async function handleCreateGateEntry(req: NextApiRequest, res: NextApiResponse, guardId: string) {
  try {
    const {
      personType,
      employeeId,
      visitorId,
      newVisitorName,
      newVisitorPurpose,
      newVisitorPhone,
      notes
    } = req.body;

    if (!personType || !['Staff', 'Visitor'].includes(personType)) {
      return res.status(400).json({ error: 'Invalid person type' });
    }

    if (personType === 'Staff' && !employeeId) {
      return res.status(400).json({ error: 'Employee ID required for staff' });
    }

    let visitorIdToUse = visitorId;

    // If creating new visitor
    if (personType === 'Visitor' && newVisitorName) {
      const newVisitor = await prisma.visitor.create({
        data: {
          name: newVisitorName,
          purpose: newVisitorPurpose || 'Not specified',
          contactNumber: newVisitorPhone
        }
      });
      visitorIdToUse = newVisitor.id;
    } else if (personType === 'Visitor' && !visitorId && !newVisitorName) {
      return res.status(400).json({ error: 'Visitor information required' });
    }

    // Create gate entry
    const entry = await prisma.gateEntry.create({
      data: {
        guardId,
        personType,
        employeeId: personType === 'Staff' ? employeeId : null,
        visitorId: personType === 'Visitor' ? visitorIdToUse : null,
        entryTime: new Date(),
        notes
      },
      include: {
        employee: {
          select: {
            id: true,
            fullName: true,
            designation: true
          }
        },
        visitor: {
          select: {
            id: true,
            name: true,
            purpose: true
          }
        }
      }
    });

    return res.status(201).json({ message: 'Entry recorded', entry });
  } catch (error) {
    console.error('Error creating gate entry:', error);
    return res.status(500).json({ error: 'Failed to record entry' });
  }
}

async function handleGetGateRegister(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { date } = req.query;

    // Parse date
    let dateFilter: any = {};
    if (date) {
      const startDate = new Date(date as string);
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + 1);

      dateFilter = {
        entryTime: {
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
        entryTime: {
          gte: today,
          lt: tomorrow
        }
      };
    }

    const entries = await prisma.gateEntry.findMany({
      where: dateFilter,
      include: {
        employee: {
          select: {
            id: true,
            fullName: true,
            designation: true
          }
        },
        visitor: {
          select: {
            id: true,
            name: true,
            purpose: true,
            contactNumber: true
          }
        }
      },
      orderBy: {
        entryTime: 'desc'
      }
    });

    return res.status(200).json({ entries });
  } catch (error) {
    console.error('Error getting gate register:', error);
    return res.status(500).json({ error: 'Failed to fetch gate register' });
  }
}

export default handler;
