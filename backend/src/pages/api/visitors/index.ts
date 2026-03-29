import { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';
import { setCorsHeaders } from '@/lib/cors'
const prisma = new PrismaClient();

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const origin = req.headers.origin
  setCorsHeaders(res, origin as string | undefined)

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

  // Verify user is a Guard or Admin
  const user = await prisma.employee.findUnique({
    where: { id: userId },
    select: { designation: true }
  });

  const allowedRoles = ['Guard', 'Super Admin', 'Director', 'Stable Manager', 'Ground Supervisor', 'School Administrator'];
  if (!user || !allowedRoles.includes(user.designation)) {
    return res.status(403).json({ error: 'You do not have permission to manage visitors' });
  }

  if (req.method === 'GET') {
    return handleGetVisitors(req, res);
  } else if (req.method === 'POST') {
    return handleCreateVisitor(req, res);
  } else {
    res.setHeader('Allow', ['GET', 'POST']);
    return res.status(405).json({ error: 'Method not allowed' });
  }
}

async function handleGetVisitors(_req: NextApiRequest, res: NextApiResponse) {
  try {
    const visitors = await prisma.visitor.findMany({
      orderBy: {
        createdAt: 'desc'
      },
      take: 100
    });

    return res.status(200).json({ visitors });
  } catch (error) {
    console.error('Error getting visitors:', error);
    return res.status(500).json({ error: 'Failed to fetch visitors' });
  }
}

async function handleCreateVisitor(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { name, purpose, contactNumber } = req.body;

    if (!name || !purpose) {
      return res.status(400).json({ error: 'Name and purpose are required' });
    }

    // Validate and sanitize inputs
    if (typeof name !== 'string' || name.trim().length < 1 || name.trim().length > 200) {
      return res.status(400).json({ error: 'Name must be 1-200 characters' });
    }
    if (typeof purpose !== 'string' || purpose.trim().length < 1 || purpose.trim().length > 500) {
      return res.status(400).json({ error: 'Purpose must be 1-500 characters' });
    }
    if (contactNumber && (typeof contactNumber !== 'string' || !/^\+?[\d\s\-()]{6,20}$/.test(contactNumber.trim()))) {
      return res.status(400).json({ error: 'Invalid contact number format' });
    }

    const sanitize = (s: string) => s.replace(/<[^>]*>/g, '').trim();

    const visitor = await prisma.visitor.create({
      data: {
        name: sanitize(name),
        purpose: sanitize(purpose),
        contactNumber: contactNumber ? contactNumber.trim() : null
      }
    });

    return res.status(201).json({ message: 'Visitor created', visitor });
  } catch (error) {
    console.error('Error creating visitor:', error);
    return res.status(500).json({ error: 'Failed to create visitor' });
  }
}

export default handler;

