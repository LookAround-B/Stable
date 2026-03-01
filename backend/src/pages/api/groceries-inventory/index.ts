import { NextApiRequest, NextApiResponse } from "next";
import prisma from "@/lib/prisma";
import { verifyToken } from "@/lib/auth";

const ALLOWED_ROLES = ["Senior Executive Admin", "Junior Executive Admin", "Restaurant Manager"];

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // CORS headers
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET,OPTIONS,PATCH,DELETE,POST,PUT"
  );
  res.setHeader(
    "Access-Control-Allow-Headers",
    "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization"
  );

  if (req.method === "OPTIONS") {
    res.status(200).end();
    return;
  }

  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return res.status(401).json({ error: "Invalid token" });
    }

    // Verify user exists and has required role
    const user = await prisma.employee.findUnique({
      where: { id: decoded.id },
    });

    if (!user) {
      return res.status(401).json({ error: "User not found" });
    }

    if (!ALLOWED_ROLES.includes(user.designation)) {
      return res.status(403).json({
        error: `Only ${ALLOWED_ROLES.join(", ")} can access this resource`,
      });
    }

    if (req.method === "GET") {
      return handleGet(res);
    } else if (req.method === "POST") {
      return handlePost(req, res, decoded.id);
    } else if (req.method === "PUT") {
      return handlePut(req, res);
    } else if (req.method === "DELETE") {
      return handleDelete(req, res);
    } else {
      res.status(405).json({ error: "Method not allowed" });
    }
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}

async function handleGet(res: NextApiResponse) {
  const groceries = await prisma.groceriesInventory.findMany({
    include: {
      employee: {
        select: { id: true, fullName: true, designation: true },
      },
      createdBy: {
        select: { id: true, fullName: true, designation: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  res.status(200).json(groceries);
}

async function handlePost(
  req: NextApiRequest,
  res: NextApiResponse,
  userId: string
) {
  const { name, quantity, unit, price, description, employeeId } = req.body;

  if (!name || quantity === undefined || !price) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  const totalPrice = quantity * price;

  const grocery = await prisma.groceriesInventory.create({
    data: {
      name,
      quantity: parseFloat(quantity),
      unit: unit || "kg",
      price: parseFloat(price),
      totalPrice,
      description: description || null,
      employeeId: employeeId || null,
      createdById: userId,
    },
    include: {
      employee: {
        select: { id: true, fullName: true, designation: true },
      },
      createdBy: {
        select: { id: true, fullName: true, designation: true },
      },
    },
  });

  res.status(201).json(grocery);
}

async function handlePut(req: NextApiRequest, res: NextApiResponse) {
  const { id, name, quantity, unit, price, description, employeeId } =
    req.body;

  if (!id) {
    return res.status(400).json({ error: "ID is required" });
  }

  const totalPrice =
    (quantity !== undefined && price !== undefined
      ? quantity * price
      : undefined) || null;

  const grocery = await prisma.groceriesInventory.update({
    where: { id },
    data: {
      ...(name && { name }),
      ...(quantity !== undefined && { quantity: parseFloat(quantity) }),
      ...(unit && { unit }),
      ...(price !== undefined && { price: parseFloat(price) }),
      ...(totalPrice !== null && { totalPrice }),
      ...(description !== undefined && { description: description || null }),
      ...(employeeId !== undefined && { employeeId: employeeId || null }),
    },
    include: {
      employee: {
        select: { id: true, fullName: true, designation: true },
      },
      createdBy: {
        select: { id: true, fullName: true, designation: true },
      },
    },
  });

  res.status(200).json(grocery);
}

async function handleDelete(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.body;

  if (!id) {
    return res.status(400).json({ error: "ID is required" });
  }

  await prisma.groceriesInventory.delete({
    where: { id },
  });

  res.status(200).json({ message: "Grocery deleted successfully" });
}
