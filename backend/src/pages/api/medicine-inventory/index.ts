import type { NextApiRequest, NextApiResponse } from 'next';
import { verifyToken, checkPermission } from '@/lib/auth';
import prisma from '@/lib/prisma';

const AUTHORIZED_ROLES = [
  'Super Admin',
  'Director',
  'School Administrator',
  'Stable Manager',
  'Jamedar',
  'Ground Supervisor',
];

const MEDICINE_TYPES = [
  'antibiotic',
  'antiseptic',
  'painkiller',
  'vitamin',
  'dewormer',
  'injection',
  'ointment',
  'supplement',
];

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '1mb',
    },
  },
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Cross-Origin-Opener-Policy', 'unsafe-none');

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

    if (!AUTHORIZED_ROLES.includes(user.designation)) {
      // Fall back to permission-based check
      const allowed = await checkPermission(decoded, 'manageInventory');
      if (!allowed) {
        return res.status(403).json({ error: 'You do not have permission to manage medicine inventory' });
      }
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
      case 'PATCH':
        return handlePatch(req, res, user);
      default:
        res.setHeader('Allow', ['GET', 'POST', 'PUT', 'DELETE', 'PATCH']);
        return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error: any) {
    console.error('Medicine inventory API error:', error);
    return res.status(500).json({ error: 'Internal server error', message: String(error) });
  }
}

// GET - Fetch inventory records
async function handleGet(req: NextApiRequest, res: NextApiResponse) {
  const { month, year, medicineType } = req.query;

  const where: any = {};

  if (month) where.month = parseInt(month as string);
  if (year) where.year = parseInt(year as string);
  if (medicineType) where.medicineType = medicineType as string;

  const records = await prisma.medicineInventory.findMany({
    where,
    include: {
      recordedBy: {
        select: { id: true, fullName: true },
      },
    },
    orderBy: [{ year: 'desc' }, { month: 'desc' }, { medicineType: 'asc' }],
  });

  return res.status(200).json({ data: records, medicineTypes: MEDICINE_TYPES });
}

// POST - Create or update inventory entry for a month
async function handlePost(
  req: NextApiRequest,
  res: NextApiResponse,
  user: { id: string; fullName: string; designation: string }
) {
  const { medicineType, customMedicineType, month, year, unitsPurchased, openingStock, unit, notes } = req.body;
  const rawMedicineType =
    medicineType === '__other__' || medicineType === 'Others'
      ? customMedicineType
      : medicineType;
  const normalizedMedicineType = typeof rawMedicineType === 'string' ? rawMedicineType.trim() : '';

  if (!normalizedMedicineType || !month || !year) {
    return res.status(400).json({ error: 'Medicine type, month, and year are required' });
  }

  const monthNum = parseInt(month);
  const yearNum = parseInt(year);

  if (monthNum < 1 || monthNum > 12) {
    return res.status(400).json({ error: 'Month must be between 1 and 12' });
  }

  try {
    // Check if record already exists
    const existing = await prisma.medicineInventory.findUnique({
      where: {
        medicineType_month_year: {
          medicineType: normalizedMedicineType,
          month: monthNum,
          year: yearNum,
        },
      },
    });

    if (existing) {
      return res.status(400).json({ error: 'Medicine inventory record already exists for this month and medicine type' });
    }

    const record = await prisma.medicineInventory.create({
      data: {
        medicineType: normalizedMedicineType,
        month: monthNum,
        year: yearNum,
        unitsPurchased: parseFloat(unitsPurchased) || 0,
        openingStock: parseFloat(openingStock) || 0,
        unit: unit || 'ml',
        notes: notes || null,
        recordedById: user.id,
        totalUsed: 0,
        unitsLeft: (parseFloat(openingStock) || 0) + (parseFloat(unitsPurchased) || 0),
      },
      include: {
        recordedBy: {
          select: { id: true, fullName: true },
        },
      },
    });

    await checkAndNotifyThreshold(record.id, 'medicine', record.unitsLeft, record.threshold, record.notifyAdmin, record.medicineType, record.unit);

    return res.status(201).json(record);
  } catch (error: any) {
    console.error('Error creating medicine inventory:', error);
    return res.status(500).json({ error: 'Failed to create medicine inventory record' });
  }
}

// PUT - Update inventory entry
async function handlePut(
  req: NextApiRequest,
  res: NextApiResponse,
  _user: { id: string; fullName: string; designation: string }
) {
  const { id, unitsPurchased, openingStock, totalUsed, notes } = req.body;

  if (!id) {
    return res.status(400).json({ error: 'id is required' });
  }

  try {
    // Check if record exists
    const existing = await prisma.medicineInventory.findUnique({
      where: { id },
    });

    if (!existing) {
      return res.status(404).json({ error: 'Medicine inventory record not found' });
    }

    // Calculate unitsLeft
    const opening = openingStock !== undefined ? parseFloat(openingStock) : existing.openingStock;
    const purchased = unitsPurchased !== undefined ? parseFloat(unitsPurchased) : existing.unitsPurchased;
    const used = totalUsed !== undefined ? parseFloat(totalUsed) : existing.totalUsed;
    const unitsLeft = opening + purchased - used;

    const updated = await prisma.medicineInventory.update({
      where: { id },
      data: {
        unitsPurchased: purchased,
        openingStock: opening,
        totalUsed: used,
        unitsLeft,
        notes: notes !== undefined ? notes : existing.notes,
      },
      include: {
        recordedBy: {
          select: { id: true, fullName: true },
        },
      },
    });

    await checkAndNotifyThreshold(updated.id, 'medicine', updated.unitsLeft, updated.threshold, updated.notifyAdmin, updated.medicineType, updated.unit);

    return res.status(200).json(updated);
  } catch (error: any) {
    console.error('Error updating medicine inventory:', error);
    return res.status(500).json({ error: 'Failed to update medicine inventory record' });
  }
}

// DELETE - Delete inventory entry (only if created by current user or admin)
async function handleDelete(
  req: NextApiRequest,
  res: NextApiResponse,
  user: { id: string; fullName: string; designation: string }
) {
  const { id } = req.body;

  if (!id) {
    return res.status(400).json({ error: 'id is required' });
  }

  try {
    // Check if record exists
    const record = await prisma.medicineInventory.findUnique({
      where: { id },
    });

    if (!record) {
      return res.status(404).json({ error: 'Medicine inventory record not found' });
    }

    // Check authorization - only creator or Super Admin can delete
    if (record.recordedById !== user.id && !['Super Admin', 'Director'].includes(user.designation)) {
      return res.status(403).json({ error: 'You do not have permission to delete this record' });
    }

    await prisma.medicineInventory.delete({
      where: { id },
    });

    return res.status(200).json({ message: 'Medicine inventory record deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting medicine inventory:', error);
    return res.status(500).json({ error: 'Failed to delete medicine inventory record' });
  }
}

// PATCH - Set threshold for an inventory item (Super Admin, Director, School Administrator)
async function handlePatch(
  req: NextApiRequest,
  res: NextApiResponse,
  user: { id: string; fullName: string; designation: string }
) {
  if (!['Super Admin', 'Director', 'School Administrator'].includes(user.designation)) {
    return res.status(403).json({ error: 'Only Super Admin, Director, or School Administrator can configure thresholds' });
  }

  const { id, threshold, notifyAdmin } = req.body;
  if (!id) return res.status(400).json({ error: 'Record ID is required' });

  const record = await prisma.medicineInventory.update({
    where: { id },
    data: {
      threshold: threshold !== undefined ? (threshold === null || threshold === '' ? null : parseFloat(threshold)) : undefined,
      notifyAdmin: notifyAdmin !== undefined ? Boolean(notifyAdmin) : undefined,
    },
    include: { recordedBy: { select: { id: true, fullName: true } } },
  });

  await checkAndNotifyThreshold(record.id, 'medicine', record.unitsLeft, record.threshold, record.notifyAdmin, record.medicineType, record.unit);

  return res.status(200).json({ data: record, message: 'Threshold updated' });
}

// Helper — create admin notification when inventory falls below threshold
async function checkAndNotifyThreshold(
  _recordId: string,
  inventoryType: string,
  currentQty: number,
  threshold: number | null,
  notifyAdmin: boolean,
  itemName: string,
  unit: string
) {
  if (!notifyAdmin || threshold === null || threshold === undefined) return;
  if (currentQty >= threshold) return;

  try {
    const admin = await prisma.employee.findFirst({
      where: { email: 'admin@test.com' },
      select: { id: true },
    });
    if (!admin) return;

    await prisma.notification.create({
      data: {
        employeeId: admin.id,
        type: 'inventory_threshold_alert',
        title: `Low ${inventoryType} inventory: ${itemName}`,
        message: `${itemName} stock is ${currentQty} ${unit}, below the threshold of ${threshold} ${unit}.`,
        isRead: false,
      },
    });
  } catch (err) {
    console.error('Failed to send threshold notification:', err);
  }
}
