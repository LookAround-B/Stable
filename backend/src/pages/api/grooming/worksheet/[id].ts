import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '../../../../lib/prisma';
import { verifyAuth } from '../../../../lib/auth';

const CORS_ALLOWED_ORIGINS = ['http://localhost:3001', 'http://localhost:3000', 'http://localhost:3002'];

function setCorsHeaders(res: NextApiResponse, origin?: string) {
  if (origin && CORS_ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  } else if (CORS_ALLOWED_ORIGINS.length > 0) {
    res.setHeader('Access-Control-Allow-Origin', CORS_ALLOWED_ORIGINS[0]);
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const origin = req.headers.origin;
  setCorsHeaders(res, origin);

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    const { id } = req.query;

    if (req.method === 'GET') {
      // Get single worksheet
      const worksheet = await prisma.groomWorkSheet.findUnique({
        where: { id: id as string },
        include: {
          groom: {
            select: {
              id: true,
              fullName: true,
              designation: true,
            },
          },
          entries: {
            include: {
              horse: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
      });

      if (!worksheet) {
        return res.status(404).json({ message: 'Worksheet not found' });
      }

      return res.status(200).json({
        data: worksheet,
        message: 'Worksheet retrieved',
      });
    } else if (req.method === 'PATCH') {
      // Update worksheet
      const { remarks } = req.body;

      const worksheet = await prisma.groomWorkSheet.update({
        where: { id: id as string },
        data: {
          remarks,
          updatedAt: new Date(),
        },
        include: {
          groom: {
            select: {
              id: true,
              fullName: true,
              designation: true,
            },
          },
          entries: {
            include: {
              horse: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
      });

      return res.status(200).json({
        message: 'Worksheet updated',
        data: worksheet,
      });
    } else if (req.method === 'DELETE') {
      // Delete worksheet
      await prisma.groomWorkSheet.delete({
        where: { id: id as string },
      });

      return res.status(200).json({
        message: 'Worksheet deleted',
      });
    } else {
      res.setHeader('Allow', ['GET', 'PATCH', 'DELETE']);
      return res.status(405).json({ message: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Groom Worksheet API error:', error);
    return res.status(500).json({ message: 'Internal server error', error: String(error) });
  }
}
