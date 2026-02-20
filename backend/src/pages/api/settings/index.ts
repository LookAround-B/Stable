// pages/api/settings/index.ts
import type { NextApiRequest, NextApiResponse } from 'next'
import { getTokenFromRequest, verifyToken } from '@/lib/auth'
import prisma from '@/lib/prisma'
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Run CORS middlewareconst token = getTokenFromRequest(req as any)
  const decoded = verifyToken(token || '')

  // Only admins can modify settings
  if (!decoded || decoded.designation !== 'Super Admin') {
    return res.status(403).json({ error: 'Forbidden' })
  }

  switch (req.method) {
    case 'GET':
      return handleGetSettings(req, res)
    case 'PUT':
      return handleUpdateSetting(req, res)
    default:
      return res.status(405).json({ error: 'Method not allowed' })
  }
}

async function handleGetSettings(_req: NextApiRequest, res: NextApiResponse) {
  try {
    const settings = await prisma.systemSettings.findMany()

    return res.status(200).json({ data: settings })
  } catch (error) {
    console.error('Error fetching settings:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}

async function handleUpdateSetting(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { key, value, description } = req.body

    if (!key || !value) {
      return res.status(400).json({ error: 'Missing required fields' })
    }

    const setting = await prisma.systemSettings.upsert({
      where: { key },
      update: { value, description },
      create: { key, value, description },
    })

    return res.status(200).json(setting)
  } catch (error) {
    console.error('Error updating setting:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}

