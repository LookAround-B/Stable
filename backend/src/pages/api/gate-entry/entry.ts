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

  // Verify user is a Guard
  const user = await prisma.employee.findUnique({
    where: { id: userId },
    select: { designation: true }
  });

  if (!user || user.designation !== 'Guard') {
    return res.status(403).json({ error: 'Only Guards can record entries' });
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: 'Method not allowed' });
  }

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
          contactNumber: newVisitorPhone || null
        }
      });
      visitorIdToUse = newVisitor.id;
    } else if (personType === 'Visitor' && !visitorId && !newVisitorName) {
      return res.status(400).json({ error: 'Visitor information required' });
    }

    // Create gate entry
    const entry = await prisma.gateEntry.create({
      data: {
        guardId: userId,
        personType,
        employeeId: personType === 'Staff' ? employeeId : null,
        visitorId: personType === 'Visitor' ? visitorIdToUse : null,
        vehicleNo: vehicleNo || null,
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
            purpose: true,
            contactNumber: true
          }
        }
      }
    });

    return res.status(201).json({ message: 'Entry recorded', entry });
  } catch (error) {
    console.error('Error recording entry:', error);
    return res.status(500).json({ error: 'Failed to record entry' });
  }
}

export default handler;
