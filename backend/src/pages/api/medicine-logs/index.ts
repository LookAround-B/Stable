import type { NextApiRequest, NextApiResponse } from 'next';
import { verifyToken } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { setCorsHeaders } from '@/lib/cors'
import { sanitizeString, isValidString, isValidId, safeDate } from '@/lib/validate'

const JAMEDAR_ROLES = ['Jamedar'];

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '1mb',
    },
  },
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const origin = req.headers.origin
  setCorsHeaders(res, origin as string | undefined)

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // Verify authentication
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'No authorization header' });
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    const user = await prisma.employee.findUnique({
      where: { id: decoded.id },
      select: { id: true, email: true, designation: true, fullName: true },
    });

    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    switch (req.method) {
      case 'GET':
        return handleGet(req, res);
      case 'POST':
        return handlePost(req, res, user);
      case 'PUT':
        return handlePut(req, res, user);
      case 'DELETE':
        return handleDelete(req, res, user);
      default:
        res.setHeader('Allow', ['GET', 'POST', 'PUT', 'DELETE']);
        return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error: any) {
    console.error('Medicine logs API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

// GET - Fetch medicine logs
async function handleGet(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { jamiedarId, horseId, approvalStatus, startDate, endDate } = req.query;

  const where: any = {};

  if (jamiedarId) {
    where.jamiedarId = jamiedarId as string;
  }

  if (horseId) {
    where.horseId = horseId as string;
  }

  if (approvalStatus) {
    where.approvalStatus = approvalStatus as string;
  }

  if (startDate || endDate) {
    where.timeAdministered = {};
    if (startDate) {
      where.timeAdministered.gte = new Date(startDate as string);
    }
    if (endDate) {
      where.timeAdministered.lte = new Date(endDate as string);
    }
  }

  const logs = await prisma.medicineLog.findMany({
    where,
    include: {
      jamedar: {
        select: {
          id: true,
          fullName: true,
          designation: true,
        },
      },
      horse: {
        select: {
          id: true,
          name: true,
        },
      },
      approvedBy: {
        select: {
          id: true,
          fullName: true,
          designation: true,
        },
      },
    },
    orderBy: {
      timeAdministered: 'desc',
    },
  });

  return res.status(200).json({ data: logs });
}

// POST - Create new medicine log or approve/reject
async function handlePost(
  req: NextApiRequest,
  res: NextApiResponse,
  user: { id: string; fullName: string; designation: string }
) {
  const { jamiedarId, horseId, medicineName, quantity, unit, timeAdministered, notes, photoUrl } = req.body;

  // Validate required fields
  if (!isValidId(jamiedarId)) {
    return res.status(400).json({ error: 'Valid jamiedarId is required' });
  }
  if (!isValidId(horseId)) {
    return res.status(400).json({ error: 'Valid horseId is required' });
  }
  if (!isValidString(medicineName, 1, 200)) {
    return res.status(400).json({ error: 'Medicine name is required (max 200 chars)' });
  }
  const qty = parseFloat(quantity);
  if (isNaN(qty) || qty <= 0 || qty > 100000) {
    return res.status(400).json({ error: 'Quantity must be a positive number (max 100000)' });
  }
  if (!safeDate(timeAdministered)) {
    return res.status(400).json({ error: 'Valid timeAdministered date is required' });
  }
  if (unit && !isValidString(unit, 1, 20)) {
    return res.status(400).json({ error: 'Unit must be max 20 chars' });
  }
  if (notes && !isValidString(notes, 0, 1000)) {
    return res.status(400).json({ error: 'Notes must be max 1000 chars' });
  }
  if (photoUrl && typeof photoUrl === 'string' && photoUrl.length > 2000) {
    return res.status(400).json({ error: 'Photo URL too long' });
  }

  // Only Jamedar can create medicine logs
  if (!JAMEDAR_ROLES.includes(user.designation)) {
    return res.status(403).json({ error: 'Only Jamedar can create medicine logs' });
  }

  try {
    // Check if jamedar exists
    const jamedar = await prisma.employee.findUnique({
      where: { id: jamiedarId },
    });

    if (!jamedar || jamedar.designation !== 'Jamedar') {
      return res.status(404).json({ error: 'Jamedar not found' });
    }

    // Check if horse exists
    const horse = await prisma.horse.findUnique({
      where: { id: horseId },
    });

    if (!horse) {
      return res.status(404).json({ error: 'Horse not found' });
    }

    // Create medicine log with pending approval status
    const log = await prisma.medicineLog.create({
      data: {
        jamiedarId,
        horseId,
        medicineName: sanitizeString(medicineName),
        quantity: qty,
        unit: unit || 'ml',
        timeAdministered: new Date(timeAdministered),
        notes: notes ? sanitizeString(notes) : null,
        photoUrl: photoUrl || null,
        approvalStatus: 'pending',
      },
      include: {
        jamedar: {
          select: {
            id: true,
            fullName: true,
            designation: true,
          },
        },
        horse: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return res.status(201).json(log);
  } catch (error: any) {
    console.error('Error creating medicine log:', error);
    return res.status(500).json({ error: 'Failed to create medicine log' });
  }
}

// PUT - Update medicine log (only if pending)
async function handlePut(
  req: NextApiRequest,
  res: NextApiResponse,
  user: { id: string; fullName: string; designation: string }
) {
  const { id, medicineName, quantity, unit, timeAdministered, notes, photoUrl } = req.body;

  if (!isValidId(id)) {
    return res.status(400).json({ error: 'Valid id is required' });
  }
  if (medicineName && !isValidString(medicineName, 1, 200)) {
    return res.status(400).json({ error: 'Medicine name must be max 200 chars' });
  }
  if (notes !== undefined && notes && !isValidString(notes, 0, 1000)) {
    return res.status(400).json({ error: 'Notes must be max 1000 chars' });
  }

  // Only Jamedar can update logs
  if (!JAMEDAR_ROLES.includes(user.designation)) {
    return res.status(403).json({ error: 'Only Jamedar can update medicine logs' });
  }

  try {
    // Check if log exists
    const log = await prisma.medicineLog.findUnique({
      where: { id },
    });

    if (!log) {
      return res.status(404).json({ error: 'Medicine log not found' });
    }

    // Only allow updating if pending
    if (log.approvalStatus !== 'pending') {
      return res.status(403).json({ error: 'Only pending logs can be updated' });
    }

    // Update medicine log
    const updatedLog = await prisma.medicineLog.update({
      where: { id },
      data: {
        medicineName: medicineName ? sanitizeString(medicineName) : log.medicineName,
        quantity: quantity !== undefined ? parseFloat(quantity) : log.quantity,
        unit: unit || log.unit,
        timeAdministered: timeAdministered ? new Date(timeAdministered) : log.timeAdministered,
        notes: notes !== undefined ? (notes ? sanitizeString(notes) : null) : log.notes,
        photoUrl: photoUrl !== undefined ? photoUrl : log.photoUrl,
      },
      include: {
        jamedar: {
          select: {
            id: true,
            fullName: true,
            designation: true,
          },
        },
        horse: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return res.status(200).json(updatedLog);
  } catch (error: any) {
    console.error('Error updating medicine log:', error);
    return res.status(500).json({ error: 'Failed to update medicine log' });
  }
}

// DELETE - Delete medicine log (only if pending)
async function handleDelete(
  req: NextApiRequest,
  res: NextApiResponse,
  user: { id: string; fullName: string; designation: string }
) {
  const { id } = req.body;

  if (!id) {
    return res.status(400).json({ error: 'id is required' });
  }

  // Only Jamedar can delete logs
  if (!JAMEDAR_ROLES.includes(user.designation)) {
    return res.status(403).json({ error: 'Only Jamedar can delete medicine logs' });
  }

  try {
    // Check if log exists
    const log = await prisma.medicineLog.findUnique({
      where: { id },
    });

    if (!log) {
      return res.status(404).json({ error: 'Medicine log not found' });
    }

    // Only allow deleting if pending
    if (log.approvalStatus !== 'pending') {
      return res.status(403).json({ error: 'Only pending logs can be deleted' });
    }

    await prisma.medicineLog.delete({
      where: { id },
    });

    return res.status(200).json({ message: 'Medicine log deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting medicine log:', error);
    return res.status(500).json({ error: 'Failed to delete medicine log' });
  }
}

