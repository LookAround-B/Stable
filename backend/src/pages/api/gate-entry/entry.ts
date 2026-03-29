import { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';
import { setCorsHeaders } from '@/lib/cors'

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

  // Verify user is a Guard or supervisor
  const user = await prisma.employee.findUnique({
    where: { id: userId },
    select: { designation: true, id: true }
  });

  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  // Allow Guards and supervisors to record entries
  const ALLOWED_ROLES = ['Guard', 'Super Admin', 'Director', 'School Administrator', 'Stable Manager', 'Ground Supervisor'];
  const userDesignation = user.designation?.trim();
  const canRecord = ALLOWED_ROLES.includes(userDesignation);

  if (!canRecord) {
    return res.status(403).json({ 
      error: 'Only Guards and supervisors can record entries',
      userRole: userDesignation
    });
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
      return res.status(400).json({ error: 'Invalid person type. Must be Staff or Visitor.' });
    }

    if (personType === 'Staff' && !employeeId) {
      return res.status(400).json({ error: 'Employee ID required for staff' });
    }

    // Validate string lengths 
    if (newVisitorName && (typeof newVisitorName !== 'string' || newVisitorName.length > 200)) {
      return res.status(400).json({ error: 'Visitor name must be under 200 characters' });
    }
    if (newVisitorPurpose && (typeof newVisitorPurpose !== 'string' || newVisitorPurpose.length > 500)) {
      return res.status(400).json({ error: 'Purpose must be under 500 characters' });
    }
    if (newVisitorPhone && (typeof newVisitorPhone !== 'string' || !/^\+?[\d\s\-()]{6,20}$/.test(newVisitorPhone.trim()))) {
      return res.status(400).json({ error: 'Invalid phone number format' });
    }
    if (vehicleNo && (typeof vehicleNo !== 'string' || vehicleNo.length > 20)) {
      return res.status(400).json({ error: 'Vehicle number must be under 20 characters' });
    }
    if (notes && (typeof notes !== 'string' || notes.length > 1000)) {
      return res.status(400).json({ error: 'Notes must be under 1000 characters' });
    }

    const sanitize = (s: string) => s.replace(/<[^>]*>/g, '').trim();

    let visitorIdToUse = visitorId;

    // If creating new visitor
    if (personType === 'Visitor' && newVisitorName) {
      const newVisitor = await prisma.visitor.create({
        data: {
          name: sanitize(newVisitorName),
          purpose: newVisitorPurpose ? sanitize(newVisitorPurpose) : 'Not specified',
          contactNumber: newVisitorPhone ? newVisitorPhone.trim() : null
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
        vehicleNo: vehicleNo ? sanitize(vehicleNo) : null,
        entryTime: new Date(),
        notes: notes ? sanitize(notes) : undefined
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

