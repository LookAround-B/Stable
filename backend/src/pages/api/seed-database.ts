import type { NextApiRequest, NextApiResponse } from 'next'
import { PrismaClient } from '@prisma/client'
import bcryptjs from 'bcryptjs'

const prisma = new PrismaClient()

// Simple seed endpoint - should be deleted after use!
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Security: Only allow in development
  if (process.env.NODE_ENV === 'production' && req.headers['x-seed-token'] !== process.env.SEED_TOKEN) {
    return res.status(403).json({ error: 'Forbidden' })
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    console.log('🌱 Seeding database...')

    const testUsers = [
      {
        email: 'admin@test.com',
        password: 'password123',
        fullName: 'Admin User',
        designation: 'Super Admin',
        department: 'Leadership',
      },
      {
        email: 'guard@test.com',
        password: 'password123',
        fullName: 'John Guard',
        designation: 'Guard',
        department: 'Ground Operations',
      },
      {
        email: 'jamedar@test.com',
        password: 'password123',
        fullName: 'Raj Jamedar',
        designation: 'Jamedar',
        department: 'Stable Operations',
      },
    ]

    for (const userData of testUsers) {
      const hashedPassword = await bcryptjs.hash(userData.password, 10)

      await prisma.employee.upsert({
        where: { email: userData.email },
        update: { password: hashedPassword },
        create: {
          email: userData.email,
          password: hashedPassword,
          fullName: userData.fullName,
          designation: userData.designation,
          department: userData.department,
          employmentStatus: 'Active',
          isApproved: true,
        },
      })
    }

    console.log('✅ Seed completed')
    return res.status(200).json({ message: 'Database seeded successfully' })
  } catch (error) {
    console.error('Seed error:', error)
    return res.status(500).json({ error: 'Failed to seed database' })
  }
}
