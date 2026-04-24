// CORS headers for Next.js API routes
import { NextApiResponse } from 'next'

const DEFAULT_ORIGINS = [
  'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:3002',
  'https://eirs.app',
  'https://www.eirs.app',
]

function getAllowedOrigins(): string[] {
  if (process.env.CORS_ORIGIN) {
    return process.env.CORS_ORIGIN.split(',').map((o) => o.trim())
  }
  const extra = process.env.FRONTEND_URL
  return extra ? [...DEFAULT_ORIGINS, extra] : DEFAULT_ORIGINS
}

/**
 * Set CORS headers on the response.
 * Reflects the requesting origin if it is in the allowlist.
 * Non-browser requests (no Origin header) get a wildcard pass-through.
 */
export function setCorsHeaders(res: NextApiResponse, origin?: string) {
  const allowedOrigins = getAllowedOrigins()

  if (origin && allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin)
  } else if (!origin) {
    res.setHeader('Access-Control-Allow-Origin', '*')
  }
  // Blocked origins intentionally receive no header — browser will reject them

  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  res.setHeader('Access-Control-Allow-Credentials', 'true')
}
