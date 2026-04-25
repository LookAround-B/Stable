import { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';
import { setCorsHeaders } from '@/lib/cors';
import { isValidString, sanitizeString } from '@/lib/validate';

const prisma = new PrismaClient();

const ALLOWED_ROLES = ['Guard', 'Super Admin', 'Director', 'School Administrator', 'Stable Manager', 'Ground Supervisor'];

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const origin = req.headers.origin;
  setCorsHeaders(res, origin as string | undefined);

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'PUT') {
    res.setHeader('Allow', ['PUT']);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) {
    return res.status(401).json({ error: 'Unauthorized - No token' });
  }

  let decoded: any;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET || 'dev-only-insecure-secret');
  } catch (_err) {
    return res.status(401).json({ error: 'Unauthorized - Invalid token' });
  }

  const userId = decoded?.id;
  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized - No user ID' });
  }

  const user = await prisma.employee.findUnique({
    where: { id: userId },
    select: { id: true, designation: true },
  });

  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  const userDesignation = user.designation?.trim();
  if (!ALLOWED_ROLES.includes(userDesignation)) {
    return res.status(403).json({
      error: 'Only Guards and supervisors can edit gate entries',
      userRole: userDesignation,
    });
  }

  try {
    let { entryId } = req.query;
    if (Array.isArray(entryId)) {
      entryId = entryId[0];
    }

    if (!entryId) {
      return res.status(400).json({ error: 'Entry ID required' });
    }

    const { vehicleNo, notes } = req.body || {};

    if (vehicleNo !== undefined && vehicleNo !== null && !isValidString(vehicleNo, 0, 30)) {
      return res.status(400).json({ error: 'Vehicle number must be max 30 chars' });
    }

    if (notes !== undefined && notes !== null && !isValidString(notes, 0, 1000)) {
      return res.status(400).json({ error: 'Notes must be max 1000 chars' });
    }

    const existingEntry = await prisma.gateEntry.findUnique({
      where: { id: entryId },
    });

    if (!existingEntry) {
      return res.status(404).json({ error: 'Entry not found' });
    }

    const updatedEntry = await prisma.gateEntry.update({
      where: { id: entryId },
      data: {
        vehicleNo: vehicleNo ? sanitizeString(vehicleNo) : null,
        notes: notes ? sanitizeString(notes) : null,
      },
      include: {
        employee: {
          select: {
            id: true,
            fullName: true,
            designation: true,
          },
        },
        visitor: {
          select: {
            id: true,
            name: true,
            purpose: true,
            contactNumber: true,
          },
        },
      },
    });

    return res.status(200).json({ message: 'Entry updated', entry: updatedEntry });
  } catch (error) {
    console.error('Error updating gate entry:', error);
    return res.status(500).json({ error: 'Failed to update entry' });
  }
}

export default handler;
