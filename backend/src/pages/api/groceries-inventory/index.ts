import { NextApiRequest, NextApiResponse } from "next";
import prisma from "@/lib/prisma";
import { verifyToken } from "@/lib/auth";
import { setCorsHeaders } from '@/lib/cors';
import { sanitizeString, isValidString, isValidId } from '@/lib/validate';

const ALLOWED_ROLES = ["Senior Executive Admin", "Junior Executive Admin", "Restaurant Manager", "Super Admin", "Director", "School Administrator"];

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const origin = req.headers.origin;
  setCorsHeaders(res, origin as string | undefined);

  if (req.method === "OPTIONS") { res.status(200).end(); return; }

  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return res.status(401).json({ error: "Unauthorized" });
    const decoded = verifyToken(token);
    if (!decoded) return res.status(401).json({ error: "Invalid token" });
    const user = await prisma.employee.findUnique({ where: { id: decoded.id } });
    if (!user) return res.status(401).json({ error: "User not found" });
    if (!ALLOWED_ROLES.includes(user.designation)) return res.status(403).json({ error: "Access denied" });

    if (req.method === "GET") {
      if (req.query.suggestions === "true") return handleSuggestions(res);
      return handleGet(req, res);
    }
    if (req.method === "POST") return handlePost(req, res, decoded.id);
    if (req.method === "PUT") return handlePut(req, res);
    if (req.method === "DELETE") return handleDelete(req, res);
    if (req.method === "PATCH") return handlePatch(req, res, user);
    res.status(405).json({ error: "Method not allowed" });
  } catch (error) {
    console.error("Groceries inventory error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}

async function handleSuggestions(res: NextApiResponse) {
  // Return distinct item names + units for the dropdown
  const rows = await prisma.groceriesInventory.findMany({
    select: { name: true, unit: true },
    orderBy: { name: "asc" },
  });
  // Deduplicate by name (keep last-seen unit)
  const map = new Map<string, string>();
  for (const r of rows) map.set(r.name.trim(), r.unit);
  const suggestions = Array.from(map.entries()).map(([name, unit]) => ({ name, unit }));
  return res.status(200).json(suggestions);
}

async function handleGet(req: NextApiRequest, res: NextApiResponse) {
  const { month, year, search } = req.query;
  const where: any = {};

  if (month && year) {
    const m = parseInt(month as string);
    const y = parseInt(year as string);
    const startDate = new Date(y, m - 1, 1);
    const endDate = new Date(y, m, 1);
    where.OR = [
      { purchaseDate: { gte: startDate, lt: endDate } },
      { AND: [{ purchaseDate: null }, { createdAt: { gte: startDate, lt: endDate } }] },
    ];
  } else if (year) {
    const y = parseInt(year as string);
    where.OR = [
      { purchaseDate: { gte: new Date(y, 0, 1), lt: new Date(y + 1, 0, 1) } },
      { AND: [{ purchaseDate: null }, { createdAt: { gte: new Date(y, 0, 1), lt: new Date(y + 1, 0, 1) } }] },
    ];
  }

  if (search) {
    const searchWhere = { name: { contains: search as string, mode: "insensitive" as const } };
    if (where.OR) {
      where.AND = [{ OR: where.OR }, searchWhere];
      delete where.OR;
    } else {
      Object.assign(where, searchWhere);
    }
  }

  const groceries = await prisma.groceriesInventory.findMany({
    where,
    include: {
      employee: { select: { id: true, fullName: true, designation: true } },
      createdBy: { select: { id: true, fullName: true, designation: true } },
    },
    orderBy: [{ purchaseDate: "desc" }, { createdAt: "desc" }],
  });

  res.status(200).json(groceries);
}

async function handlePost(req: NextApiRequest, res: NextApiResponse, userId: string) {
  const { name, quantity, unit, price, description, employeeId, purchaseDate, expiryDate } = req.body;
  if (!isValidString(name, 1, 200)) return res.status(400).json({ error: "Name is required (max 200 chars)" });
  if (quantity === undefined || isNaN(parseFloat(quantity)) || parseFloat(quantity) < 0 || parseFloat(quantity) > 10000000) {
    return res.status(400).json({ error: "Valid quantity is required (0-10000000)" });
  }
  if (unit && !isValidString(unit, 1, 30)) return res.status(400).json({ error: "Unit must be max 30 chars" });
  if (description && !isValidString(description, 0, 1000)) return res.status(400).json({ error: "Description must be max 1000 chars" });
  if (employeeId && !isValidId(employeeId)) return res.status(400).json({ error: "Invalid employeeId" });
  if (price !== undefined) {
    const p = parseFloat(price);
    if (isNaN(p) || p < 0 || p > 10000000) return res.status(400).json({ error: "Price must be 0-10000000" });
  }

  const qty = parseFloat(quantity);
  const prc = parseFloat(price || "0") || 0;
  const grocery = await prisma.groceriesInventory.create({
    data: {
      name: sanitizeString(name),
      quantity: qty,
      unit: unit ? sanitizeString(unit) : "units",
      price: prc,
      totalPrice: qty * prc,
      description: description ? sanitizeString(description) : null,
      purchaseDate: purchaseDate ? new Date(purchaseDate) : null,
      expiryDate: expiryDate ? new Date(expiryDate) : null,
      employeeId: employeeId || null,
      createdById: userId,
    },
    include: {
      employee: { select: { id: true, fullName: true, designation: true } },
      createdBy: { select: { id: true, fullName: true, designation: true } },
    },
  });
  await checkAndNotifyThreshold(grocery.id, 'groceries', grocery.quantity, grocery.threshold, grocery.notifyAdmin, grocery.name, grocery.unit);
  res.status(201).json(grocery);
}

async function handlePut(req: NextApiRequest, res: NextApiResponse) {
  const { id, name, quantity, unit, price, description, employeeId, purchaseDate, expiryDate } = req.body;
  if (!isValidId(id)) return res.status(400).json({ error: "Valid ID is required" });

  const qty = quantity !== undefined ? parseFloat(quantity) : undefined;
  const prc = price !== undefined ? (parseFloat(price) || 0) : undefined;

  const grocery = await prisma.groceriesInventory.update({
    where: { id },
    data: {
      ...(name && { name: sanitizeString(name) }),
      ...(qty !== undefined && { quantity: qty }),
      ...(unit && { unit }),
      ...(prc !== undefined && { price: prc }),
      ...(qty !== undefined && prc !== undefined && { totalPrice: qty * prc }),
      ...(description !== undefined && { description: description || null }),
      ...(purchaseDate !== undefined && { purchaseDate: purchaseDate ? new Date(purchaseDate) : null }),
      ...(expiryDate !== undefined && { expiryDate: expiryDate ? new Date(expiryDate) : null }),
      ...(employeeId !== undefined && { employeeId: employeeId || null }),
    },
    include: {
      employee: { select: { id: true, fullName: true, designation: true } },
      createdBy: { select: { id: true, fullName: true, designation: true } },
    },
  });
  await checkAndNotifyThreshold(grocery.id, 'groceries', grocery.quantity, grocery.threshold, grocery.notifyAdmin, grocery.name, grocery.unit);
  res.status(200).json(grocery);
}

async function handleDelete(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.body;
  if (!isValidId(id)) return res.status(400).json({ error: "Valid ID is required" });
  await prisma.groceriesInventory.delete({ where: { id } });
  res.status(200).json({ message: "Grocery deleted successfully" });
}

// PATCH - Set threshold (Super Admin, Director, School Administrator)
async function handlePatch(req: NextApiRequest, res: NextApiResponse, user: any) {
  if (!['Super Admin', 'Director', 'School Administrator'].includes(user.designation)) {
    return res.status(403).json({ error: 'Only Super Admin, Director, or School Administrator can configure thresholds' });
  }

  const { id, threshold, notifyAdmin } = req.body;
  if (!isValidId(id)) return res.status(400).json({ error: 'Valid ID is required' });

  const grocery = await prisma.groceriesInventory.update({
    where: { id },
    data: {
      threshold: threshold !== undefined ? (threshold === null || threshold === '' ? null : parseFloat(threshold)) : undefined,
      notifyAdmin: notifyAdmin !== undefined ? Boolean(notifyAdmin) : undefined,
    },
    include: {
      employee: { select: { id: true, fullName: true, designation: true } },
      createdBy: { select: { id: true, fullName: true, designation: true } },
    },
  });

  await checkAndNotifyThreshold(grocery.id, 'groceries', grocery.quantity, grocery.threshold, grocery.notifyAdmin, grocery.name, grocery.unit);
  return res.status(200).json(grocery);
}

// Helper — notify admin when stock falls below threshold
async function checkAndNotifyThreshold(
  _id: string,
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
