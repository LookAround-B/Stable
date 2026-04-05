// pages/api/settings/index.ts
import type { NextApiRequest, NextApiResponse } from 'next'
import { getTokenFromRequest, verifyToken } from '@/lib/auth'
import { rememberJson } from '@/lib/cache'
import {
  cacheKeys,
  CACHE_TTL_SECONDS,
  invalidateSettingsCaches,
} from '@/lib/cacheKeys'
import prisma from '@/lib/prisma'
import { setCorsHeaders } from '@/lib/cors'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const origin = req.headers.origin
  setCorsHeaders(res, origin as string | undefined)

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }
  const token = getTokenFromRequest(req as any)
  const decoded = verifyToken(token || '')

  if (!decoded || decoded.designation !== 'Super Admin') {
    return res.status(403).json({ error: 'Forbidden' })
  }

  switch (req.method) {
    case 'GET':
      return handleGetSettings(res)
    case 'PUT':
      return handleUpdateSetting(req, res)
    default:
      return res.status(405).json({ error: 'Method not allowed' })
  }
}

async function handleGetSettings(res: NextApiResponse) {
  try {
    const settings = await rememberJson(
      cacheKeys.settings(),
      CACHE_TTL_SECONDS.settings,
      async () => prisma.systemSettings.findMany()
    )

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

    if (
      typeof key !== 'string' ||
      key.length > 100 ||
      !/^[a-zA-Z0-9_.\-]+$/.test(key)
    ) {
      return res.status(400).json({
        error:
          'Invalid key format (alphanumeric, dots, dashes, underscores only, max 100 chars)',
      })
    }
    if (typeof value !== 'string' || value.length > 2000) {
      return res
        .status(400)
        .json({ error: 'Value must be a string under 2000 characters' })
    }
    if (
      description &&
      (typeof description !== 'string' || description.length > 500)
    ) {
      return res
        .status(400)
        .json({ error: 'Description must be under 500 characters' })
    }

    const sanitizedValue = value.replace(/<[^>]*>/g, '').trim()
    const sanitizedDesc = description
      ? description.replace(/<[^>]*>/g, '').trim()
      : undefined

    const setting = await prisma.systemSettings.upsert({
      where: { key },
      update: { value: sanitizedValue, description: sanitizedDesc },
      create: { key, value: sanitizedValue, description: sanitizedDesc },
    })

    await invalidateSettingsCaches()

    return res.status(200).json(setting)
  } catch (error) {
    console.error('Error updating setting:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
