import { NextApiRequest, NextApiResponse } from 'next';
import { verifyToken } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { setCorsHeaders } from '@/lib/cors'
import { sanitizeString, isValidString, isValidId, safeDate } from '@/lib/validate'

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
      case 'DELETE':
        return handleDelete(req, res, user);
      default:
        res.setHeader('Allow', ['GET', 'POST', 'DELETE']);
        return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error: any) {
    console.error('Farrier Shoeing API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

// GET - Fetch all shoeing records + pending horses
async function handleGet(req: NextApiRequest, res: NextApiResponse) {
  const { tab } = req.query;

  // Fetch all shoeing records with relations
  const shoeingRecords = await prisma.farrierShoeing.findMany({
    include: {
      horse: {
        select: { id: true, name: true, stableNumber: true, status: true },
      },
      farrier: {
        select: { id: true, fullName: true, designation: true },
      },
    },
    orderBy: { shoeingDate: 'desc' },
  });

  if (tab === 'pending') {
    // Get all active horses
    const allHorses = await prisma.horse.findMany({
      where: { status: 'Active' },
      select: { id: true, name: true, stableNumber: true, status: true },
      orderBy: { name: 'asc' },
    });

    const now = new Date();

    // For each horse, find their latest shoeing
    const latestShoeingMap: Record<string, any> = {};
    for (const record of shoeingRecords) {
      if (!latestShoeingMap[record.horseId] ||
          new Date(record.shoeingDate) > new Date(latestShoeingMap[record.horseId].shoeingDate)) {
        latestShoeingMap[record.horseId] = record;
      }
    }

    // Pending = horses whose nextDueDate is past OR horses never shoed
    const pendingHorses = allHorses.map((horse) => {
      const latest = latestShoeingMap[horse.id];
      if (!latest) {
        return {
          horse,
          lastShoeingDate: null,
          nextDueDate: null,
          farrier: null,
          daysOverdue: null,
          neverShoed: true,
        };
      }

      const nextDue = new Date(latest.nextDueDate);
      if (nextDue <= now) {
        const daysOverdue = Math.floor((now.getTime() - nextDue.getTime()) / (1000 * 60 * 60 * 24));
        return {
          horse,
          lastShoeingDate: latest.shoeingDate,
          nextDueDate: latest.nextDueDate,
          farrier: latest.farrier,
          daysOverdue,
          neverShoed: false,
        };
      }

      return null; // Not overdue
    }).filter(Boolean);

    return res.status(200).json({ data: pendingHorses });
  }

  // Default: return all completed shoeing records
  return res.status(200).json({ data: shoeingRecords });
}

// POST - Create new shoeing record
async function handlePost(
  req: NextApiRequest,
  res: NextApiResponse,
  _user: { id: string; fullName: string; designation: string }
) {
  const { horseId, farrierId, shoeingDate, notes } = req.body;

  if (!isValidId(horseId)) {
    return res.status(400).json({ error: 'Valid horseId is required' });
  }
  if (!isValidId(farrierId)) {
    return res.status(400).json({ error: 'Valid farrierId is required' });
  }
  if (!safeDate(shoeingDate)) {
    return res.status(400).json({ error: 'Valid shoeingDate is required' });
  }
  if (notes && !isValidString(notes, 0, 1000)) {
    return res.status(400).json({ error: 'Notes must be max 1000 chars' });
  }

  // Verify horse exists
  const horse = await prisma.horse.findUnique({ where: { id: horseId } });
  if (!horse) {
    return res.status(404).json({ error: 'Horse not found' });
  }

  // Verify farrier exists
  const farrier = await prisma.employee.findUnique({ where: { id: farrierId } });
  if (!farrier) {
    return res.status(404).json({ error: 'Farrier not found' });
  }

  // Calculate next due date = shoeing date + 21 days
  const shoeingDateObj = new Date(shoeingDate);
  const nextDueDate = new Date(shoeingDateObj);
  nextDueDate.setDate(nextDueDate.getDate() + 21);

  const record = await prisma.farrierShoeing.create({
    data: {
      horseId,
      farrierId,
      shoeingDate: shoeingDateObj,
      nextDueDate,
      notes: notes ? sanitizeString(notes) : null,
    },
    include: {
      horse: {
        select: { id: true, name: true, stableNumber: true, status: true },
      },
      farrier: {
        select: { id: true, fullName: true, designation: true },
      },
    },
  });

  return res.status(201).json({ message: 'Shoeing record created', data: record });
}

// DELETE - Remove a shoeing record
async function handleDelete(
  req: NextApiRequest,
  res: NextApiResponse,
  _user: { id: string; fullName: string; designation: string }
) {
  const { id } = req.body;

  if (!isValidId(id)) {
    return res.status(400).json({ error: 'Valid id is required' });
  }

  const record = await prisma.farrierShoeing.findUnique({ where: { id } });
  if (!record) {
    return res.status(404).json({ error: 'Shoeing record not found' });
  }

  await prisma.farrierShoeing.delete({ where: { id } });

  return res.status(200).json({ message: 'Shoeing record deleted' });
}
