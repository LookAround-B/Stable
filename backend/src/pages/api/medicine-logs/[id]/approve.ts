import type { NextApiRequest, NextApiResponse } from 'next';
import { verifyToken } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { setCorsHeaders } from '@/lib/cors'
import { isValidId } from '@/lib/validate'

const APPROVAL_ROLES = ['Stable Manager', 'Director', 'Super Admin', 'School Administrator'];

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

  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: 'Method not allowed' });
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

    // Check authorization
    if (!APPROVAL_ROLES.includes(user.designation)) {
      return res.status(403).json({ error: 'Only Stable Manager, Director, or Super Admin can approve medicine logs' });
    }

    const { id } = req.query;

    if (!id || typeof id !== 'string' || !isValidId(id)) {
      return res.status(400).json({ error: 'Invalid medicine log ID' });
    }

    // Check if log exists
    const log = await prisma.medicineLog.findUnique({
      where: { id: id as string },
    });

    if (!log) {
      return res.status(404).json({ error: 'Medicine log not found' });
    }

    // Only allow approving if pending
    if (log.approvalStatus !== 'pending') {
      return res.status(400).json({ error: 'Only pending logs can be approved' });
    }

    // Approve the log
    const approvedLog = await prisma.medicineLog.update({
      where: { id: id as string },
      data: {
        approvalStatus: 'approved',
        approvedById: user.id,
        approvalDate: new Date(),
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
        approvedBy: {
          select: {
            id: true,
            fullName: true,
            designation: true,
          },
        },
      },
    });

    return res.status(200).json(approvedLog);
  } catch (error: any) {
    console.error('Error approving medicine log:', error);
    return res.status(500).json({ error: 'Failed to approve medicine log' });
  }
}
