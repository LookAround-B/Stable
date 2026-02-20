import type { NextApiRequest, NextApiResponse } from 'next'

import prisma from '@/lib/prisma'
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
  if (req.method === 'GET') {
    return handleGet(req, res)
  } else if (req.method === 'POST') {
    return handlePost(req, res)
  } else if (req.method === 'DELETE') {
    return handleDelete(req, res)
  } else {
    return res.status(405).json({ error: 'Method not allowed' })
  }
}

async function handleGet(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { horseId, staffId, role, isActive } = req.query

    let whereClause: any = {}

    if (horseId) {
      whereClause.horseId = horseId
    }

    if (staffId) {
      whereClause.staffId = staffId
    }

    if (role) {
      whereClause.role = role // 'Groom', 'Rider', 'Instructor', 'Jamedar', 'Farrier'
    }

    if (isActive !== undefined) {
      whereClause.isActive = isActive === 'true'
    }

    const careTeams = await prisma.horseCareTeam.findMany({
      where: whereClause,
      include: {
        horse: {
          select: {
            id: true,
            name: true,
            status: true,
          },
        },
        staff: {
          select: {
            id: true,
            fullName: true,
            designation: true,
            department: true,
          },
        },
      },
      orderBy: {
        assignedDate: 'desc',
      },
    })

    return res.status(200).json(careTeams)
  } catch (error) {
    console.error('Error fetching horse care teams:', error)
    return res.status(500).json({ error: 'Failed to fetch horse care teams' })
  }
}

async function handlePost(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { horseId, staffId, role } = req.body

    // Validate required fields
    if (!horseId || !staffId || !role) {
      return res.status(400).json({
        error: 'horseId, staffId, and role are required',
      })
    }

    // Validate role
    const validRoles = ['Groom', 'Rider', 'Instructor', 'Jamedar', 'Farrier']
    if (!validRoles.includes(role)) {
      return res.status(400).json({
        error: `role must be one of: ${validRoles.join(', ')}`,
      })
    }

    // Check if horse exists
    const horse = await prisma.horse.findUnique({
      where: { id: horseId },
    })

    if (!horse) {
      return res.status(404).json({ error: 'Horse not found' })
    }

    // Check if staff exists
    const staff = await prisma.employee.findUnique({
      where: { id: staffId },
    })

    if (!staff) {
      return res.status(404).json({ error: 'Staff member not found' })
    }

    // Validate staff designation matches role
    const roleMapping: Record<string, string[]> = {
      'Groom': ['Groom'],
      'Rider': ['Rider', 'Riding Boy'],
      'Instructor': ['Instructor'],
      'Jamedar': ['Jamedar'],
      'Farrier': ['Farrier'],
    }

    if (!roleMapping[role].includes(staff.designation)) {
      return res.status(400).json({
        error: `Staff member with designation '${staff.designation}' cannot be assigned as '${role}'`,
      })
    }

    // Check if assignment already exists
    const existingAssignment = await prisma.horseCareTeam.findUnique({
      where: {
        horseId_staffId_role: {
          horseId,
          staffId,
          role,
        },
      },
    })

    if (existingAssignment) {
      return res.status(400).json({ error: 'This assignment already exists' })
    }

    // Create horse care team assignment
    const assignment = await prisma.horseCareTeam.create({
      data: {
        horseId,
        staffId,
        role,
        isActive: true,
      },
      include: {
        horse: {
          select: {
            id: true,
            name: true,
            status: true,
          },
        },
        staff: {
          select: {
            id: true,
            fullName: true,
            designation: true,
            department: true,
          },
        },
      },
    })

    return res.status(201).json(assignment)
  } catch (error) {
    console.error('Error creating horse care team assignment:', error)
    return res.status(500).json({ error: 'Failed to create assignment' })
  }
}

async function handleDelete(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { id } = req.query

    if (!id) {
      return res.status(400).json({ error: 'id is required' })
    }

    // Check if assignment exists
    const assignment = await prisma.horseCareTeam.findUnique({
      where: { id: id as string },
    })

    if (!assignment) {
      return res.status(404).json({ error: 'Assignment not found' })
    }

    // Delete assignment
    await prisma.horseCareTeam.delete({
      where: { id: id as string },
    })

    return res.status(200).json({ message: 'Assignment deleted successfully' })
  } catch (error) {
    console.error('Error deleting horse care team assignment:', error)
    return res.status(500).json({ error: 'Failed to delete assignment' })
  }
}

