import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '../../../../lib/prisma';
import { setCorsHeaders } from '../../../../lib/cors';
import { sanitizeString, isValidString, isValidId } from '../../../../lib/validate';


export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const origin = req.headers.origin;
  setCorsHeaders(res, origin as string | undefined);

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const { id } = req.query;

    if (!id || typeof id !== 'string' || !isValidId(id)) {
      return res.status(400).json({ message: 'Invalid worksheet ID' });
    }

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

      if (remarks !== undefined && !isValidString(remarks, 0, 1000)) {
        return res.status(400).json({ message: 'Remarks must be max 1000 chars' });
      }

      const worksheet = await prisma.groomWorkSheet.update({
        where: { id: id as string },
        data: {
          remarks: remarks !== undefined ? sanitizeString(remarks) : undefined,
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
    return res.status(500).json({ message: 'Internal server error' });
  }
}
