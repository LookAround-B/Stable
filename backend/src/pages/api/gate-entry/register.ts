import { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';
import { setCorsHeaders } from '@/lib/cors'
import { sanitizeString, isValidString, isValidId } from '@/lib/validate'

const prisma = new PrismaClient();

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const origin = req.headers.origin
  setCorsHeaders(res, origin as string | undefined)

  // Handle OPTIONS preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Verify JWT token
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) {
    return res.status(401).json({ error: 'Unauthorized - No token' });
  }

  let decoded: any;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET || 'dev-only-insecure-secret');
  } catch (err) {
    return res.status(401).json({ error: 'Unauthorized - Invalid token' });
  }

  const userId = decoded?.id;

  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized - No user ID' });
  }

  // Verify user role
  const user = await prisma.employee.findUnique({
    where: { id: userId },
    select: { designation: true, id: true }
  });

  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  // Define roles for viewing and modifying gate register
  const ALLOWED_ROLES = ['Guard', 'Super Admin', 'Director', 'School Administrator', 'Stable Manager', 'Ground Supervisor'];
  const userDesignation = user.designation?.trim();
  
  const canView = ALLOWED_ROLES.includes(userDesignation);
  const canModify = ALLOWED_ROLES.includes(userDesignation); // Allow all roles to modify for consistency

  // Check access rights
  if (!canView) {
    return res.status(403).json({ 
      error: 'Only Guards and supervisors can access gate register',
      userRole: userDesignation
    });
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
      vehicleNo,
      notes
    } = req.body;

    if (!personType || !['Staff', 'Visitor'].includes(personType)) {
      return res.status(400).json({ error: 'Invalid person type' });
    }

    if (personType === 'Staff' && !isValidId(employeeId)) {
      return res.status(400).json({ error: 'Valid Employee ID required for staff' });
    }

    let visitorIdToUse = visitorId;

    // If creating new visitor
    if (personType === 'Visitor' && newVisitorName) {
      if (!isValidString(newVisitorName, 1, 200)) {
        return res.status(400).json({ error: 'Visitor name must be 1-200 chars' });
      }
      if (newVisitorPurpose && !isValidString(newVisitorPurpose, 0, 500)) {
        return res.status(400).json({ error: 'Purpose must be max 500 chars' });
      }
      const newVisitor = await prisma.visitor.create({
        data: {
          name: sanitizeString(newVisitorName),
          purpose: newVisitorPurpose ? sanitizeString(newVisitorPurpose) : 'Not specified',
          contactNumber: newVisitorPhone || null
        }
      });
      visitorIdToUse = newVisitor.id;
    } else if (personType === 'Visitor' && !visitorId && !newVisitorName) {
      return res.status(400).json({ error: 'Visitor information required' });
    }

    // Create gate entry
    if (vehicleNo && !isValidString(vehicleNo, 0, 30)) {
      return res.status(400).json({ error: 'Vehicle number must be max 30 chars' });
    }
    if (notes && !isValidString(notes, 0, 1000)) {
      return res.status(400).json({ error: 'Notes must be max 1000 chars' });
    }
    const entry = await prisma.gateEntry.create({
      data: {
        guardId,
        personType,
        employeeId: personType === 'Staff' ? employeeId : null,
        visitorId: personType === 'Visitor' ? visitorIdToUse : null,
        vehicleNo: vehicleNo ? sanitizeString(vehicleNo) : null,
        entryTime: new Date(),
        notes: notes ? sanitizeString(notes) : null
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

