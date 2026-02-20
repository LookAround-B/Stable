import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '../../../../lib/prisma';
import { verifyToken } from '../../../../lib/auth';

interface InvoiceRecord {
  id: string;
  date: Date;
  workType: string;
  duration: number;
  horse: {
    name: string;
  };
  rider: {
    fullName: string;
  };
  notes?: string;
}

interface InvoiceData {
  invoiceId: string;
  instructor: {
    fullName: string;
    designation: string;
  };
  generatedDate: Date;
  periodStart: Date;
  periodEnd: Date;
  records: InvoiceRecord[];
  summary: {
    totalSessions: number;
    totalDuration: number; // in minutes
    totalHours: number;
    byWorkType: Record<string, { count: number; duration: number }>;
  };
}

async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Set CORS headers FIRST
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Cross-Origin-Opener-Policy', 'unsafe-none');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    // Verify authentication
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'No authorization header' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = verifyToken(token);

    if (!decoded) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    // Get full user data from database
    const user = await prisma.employee.findUnique({
      where: { id: decoded.id },
      select: {
        id: true,
        email: true,
        designation: true,
        fullName: true,
      },
    });

    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    if (req.method === 'POST') {
      const { instructorId, startDate, endDate } = req.body;

      // Authorization check
      if (user.designation === 'Instructor') {
        // Instructors can only generate for themselves
        if (instructorId && instructorId !== user.id) {
          return res.status(403).json({ error: 'You can only generate invoices for yourself' });
        }
      } else if (!['Stable Manager', 'Super Admin', 'Director', 'School Administrator'].includes(user.designation)) {
        return res.status(403).json({ error: 'You do not have permission to generate invoices' });
      }

      // Validate dates
      if (!startDate || !endDate) {
        return res.status(400).json({ error: 'startDate and endDate are required' });
      }

      const start = new Date(startDate);
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);

      if (start > end) {
        return res.status(400).json({ error: 'startDate must be before endDate' });
      }

      // Determine which instructor to get records for
      const targetInstructorId = instructorId && ['Stable Manager', 'Super Admin', 'Director', 'School Administrator'].includes(user.designation) 
        ? instructorId 
        : user.id;

      // Get instructor details
      const instructor = await prisma.employee.findUnique({
        where: { id: targetInstructorId },
        select: {
          fullName: true,
          designation: true,
          id: true,
        },
      });

      if (!instructor) {
        return res.status(404).json({ error: 'Instructor not found' });
      }

      if (instructor.designation !== 'Instructor') {
        return res.status(400).json({ error: 'Selected employee is not an instructor' });
      }

      // Get EIRS records for the period
      const records = await prisma.instructorDailyWorkRecord.findMany({
        where: {
          instructorId: targetInstructorId,
          date: {
            gte: start,
            lte: end,
          },
        },
        include: {
          horse: {
            select: {
              name: true,
            },
          },
          rider: {
            select: {
              fullName: true,
            },
          },
        },
        orderBy: { date: 'asc' },
      });

      // Calculate summary
      const summary = {
        totalSessions: records.length,
        totalDuration: records.reduce((sum, r) => sum + r.duration, 0),
        totalHours: 0,
        byWorkType: {} as Record<string, { count: number; duration: number }>,
      };

      summary.totalHours = Math.round((summary.totalDuration / 60) * 100) / 100;

      records.forEach((record) => {
        if (!summary.byWorkType[record.workType]) {
          summary.byWorkType[record.workType] = { count: 0, duration: 0 };
        }
        summary.byWorkType[record.workType].count++;
        summary.byWorkType[record.workType].duration += record.duration;
      });

      const invoice: InvoiceData = {
        invoiceId: `INV-${targetInstructorId.slice(0, 8)}-${Date.now()}`,
        instructor,
        generatedDate: new Date(),
        periodStart: start,
        periodEnd: end,
        records: records as InvoiceRecord[],
        summary,
      };

      return res.status(200).json({
        data: invoice,
        message: 'Invoice generated successfully',
      });
    } else {
      res.setHeader('Allow', ['POST']);
      return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error: any) {
    console.error('Invoice generation error:', error);
    return res.status(500).json({ error: 'Internal server error', message: String(error) });
  }
}

export default handler;

