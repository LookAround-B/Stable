import { NextApiRequest, NextApiResponse } from "next";
import prisma from "@/lib/prisma";
import { verifyToken } from "@/lib/auth";

const ALLOWED_ROLES = ["Senior Executive Admin", "Junior Executive Admin", "Restaurant Manager", "Super Admin", "Director", "School Administrator"];

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS,PATCH,DELETE,POST,PUT");
  res.setHeader("Access-Control-Allow-Headers", "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization");

  if (req.method === "OPTIONS") { res.status(200).end(); return; }

  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return res.status(401).json({ error: "Unauthorized" });
    const decoded = verifyToken(token);
    if (!decoded) return res.status(401).json({ error: "Invalid token" });
    const user = await prisma.employee.findUnique({ where: { id: decoded.id } });
    if (!user) return res.status(401).json({ error: "User not found" });
    if (!ALLOWED_ROLES.includes(user.designation)) return res.status(403).json({ error: "Access denied" });

    if (req.method === "GET") return handleGet(req, res);
    if (req.method === "POST") return handlePost(req, res, decoded.id);
    if (req.method === "PUT") return handlePut(req, res);
    if (req.method === "DELETE") return handleDelete(req, res);
    res.status(405).json({ error: "Method not allowed" });
  } catch (error) {
    console.error("Groceries inventory error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
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
  const { name, quantity, unit, price, description, employeeId, purchaseDate } = req.body;
  if (!name || quantity === undefined) return res.status(400).json({ error: "Name and quantity are required" });

  const qty = parseFloat(quantity);
  const prc = parseFloat(price || "0") || 0;
  const grocery = await prisma.groceriesInventory.create({
    data: {
      name: name.trim(),
      quantity: qty,
      unit: unit || "units",
      price: prc,
      totalPrice: qty * prc,
      description: description || null,
      purchaseDate: purchaseDate ? new Date(purchaseDate) : null,
      employeeId: employeeId || null,
      createdById: userId,
    },
    include: {
      employee: { select: { id: true, fullName: true, designation: true } },
      createdBy: { select: { id: true, fullName: true, designation: true } },
    },
  });
  res.status(201).json(grocery);
}

async function handlePut(req: NextApiRequest, res: NextApiResponse) {
  const { id, name, quantity, unit, price, description, employeeId, purchaseDate } = req.body;
  if (!id) return res.status(400).json({ error: "ID is required" });

  const qty = quantity !== undefined ? parseFloat(quantity) : undefined;
  const prc = price !== undefined ? (parseFloat(price) || 0) : undefined;

  const grocery = await prisma.groceriesInventory.update({
    where: { id },
    data: {
      ...(name && { name: name.trim() }),
      ...(qty !== undefined && { quantity: qty }),
      ...(unit && { unit }),
      ...(prc !== undefined && { price: prc }),
      ...(qty !== undefined && prc !== undefined && { totalPrice: qty * prc }),
      ...(description !== undefined && { description: description || null }),
      ...(purchaseDate !== undefined && { purchaseDate: purchaseDate ? new Date(purchaseDate) : null }),
      ...(employeeId !== undefined && { employeeId: employeeId || null }),
    },
    include: {
      employee: { select: { id: true, fullName: true, designation: true } },
      createdBy: { select: { id: true, fullName: true, designation: true } },
    },
  });
  res.status(200).json(grocery);
}

async function handleDelete(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.body;
  if (!id) return res.status(400).json({ error: "ID is required" });
  await prisma.groceriesInventory.delete({ where: { id } });
  res.status(200).json({ message: "Grocery deleted successfully" });
}
