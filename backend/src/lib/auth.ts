// JWT and Authentication utilities
import jwt from 'jsonwebtoken'
import { NextRequest, NextResponse } from 'next/server'
import type { NextApiRequest } from 'next'

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key'
const JWT_EXPIRE = process.env.JWT_EXPIRE || '7d'

export interface JwtPayload {
  id: string
  email: string
  designation: string
}

export const generateToken = (payload: JwtPayload): string => {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRE as string })
}

export const verifyToken = (token: string): JwtPayload | null => {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload
    return decoded
  } catch (error) {
    return null
  }
}

export const getTokenFromRequest = (request: NextApiRequest | NextRequest): string | null => {
  // Handle NextApiRequest (used in pages/api routes)
  if ('headers' in request && typeof request.headers === 'object' && !('get' in request.headers)) {
    const headers = request.headers as Record<string, string | string[]>
    const authHeader = headers['authorization'] as string | undefined
    if (!authHeader) return null
    
    const parts = authHeader.split(' ')
    if (parts.length !== 2 || parts[0] !== 'Bearer') return null
    
    return parts[1]
  }
  
  // Handle NextRequest (used in middleware)
  if ('headers' in request && typeof request.headers.get === 'function') {
    const authHeader = request.headers.get('authorization')
    if (!authHeader) return null
    
    const parts = authHeader.split(' ')
    if (parts.length !== 2 || parts[0] !== 'Bearer') return null
    
    return parts[1]
  }
  
  return null
}

export const createErrorResponse = (message: string, status: number) => {
  return NextResponse.json({ error: message }, { status })
}

export const createSuccessResponse = (data: any, status: number = 200) => {
  return NextResponse.json(data, { status })
}
