import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '../../../../lib/prisma';
import { setCorsHeaders } from '../../../../lib/cors';
import { handleCorsAndPreflight } from '../../../../lib/cors';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (handleCorsAndPreflight(req, res)) return;
  const origin = req.headers.origin;
  setCorsHeaders(res, origin as string | undefined);

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
