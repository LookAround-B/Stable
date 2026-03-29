// CORS middleware for Next.js API routes
import { NextApiRequest, NextApiResponse } from 'next'
import cors from 'cors'

// Get allowed origins from environment or defaults
function getAllowedOrigins(): string[] {
  if (process.env.CORS_ORIGIN) {
    const origins = process.env.CORS_ORIGIN.split(',').map((origin: string) => origin.trim());
    if (process.env.NODE_ENV === 'production') {
      console.log('[CORS] Using CORS_ORIGIN from env:', origins);
    }
    return origins;
  }
  const defaults = [
    'http://localhost:3001',
    'http://localhost:3002',
    'http://localhost:3000',
    // Vercel deployments
    // Environment variable
    process.env.FRONTEND_URL
  ].filter((url): url is string => !!url);
  
  if (process.env.NODE_ENV === 'production') {
    console.log('[CORS] CORS_ORIGIN not set, using defaults:', defaults);
  }
  return defaults;
}

// Helper to create origin validation function
function createOriginValidator() {
  return (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    const allowedOrigins = getAllowedOrigins();
    
    // Allow requests with no origin (like mobile apps, curl requests)
    if (!origin) {
      return callback(null, true);
    }
    
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      if (process.env.NODE_ENV === 'production') {
        console.log('[CORS] Origin not allowed:', {
          origin,
          allowedOrigins,
          corsOriginEnv: process.env.CORS_ORIGIN || 'NOT SET'
        });
      }
      callback(new Error('CORS not allowed'));
    }
  };
}

// Initialize the cors middleware
const corsMiddleware = cors({
  origin: createOriginValidator(),
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
})

// Create new cors middleware instance with current env variables
export function createCorsMiddleware() {
  return cors({
    origin: createOriginValidator(),
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
}

// Set CORS headers manually for API routes that don't use middleware
export function setCorsHeaders(res: NextApiResponse, origin?: string) {
  const allowedOrigins = getAllowedOrigins();
  // Only reflect the origin if it's in the allowlist; otherwise omit the header
  if (origin && allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  } else if (!origin) {
    // Non-browser requests (curl, mobile) — allow through
    res.setHeader('Access-Control-Allow-Origin', '*');
  }
  // If origin is set but not allowed, we intentionally do NOT set the header
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
}

// Helper function to run middleware
export function runMiddleware(
  req: NextApiRequest,
  res: NextApiResponse,
  fn: Function
) {
  return new Promise((resolve, reject) => {
    fn(req, res, (result: any) => {
      if (result instanceof Error) {
        return reject(result)
      }
      return resolve(result)
    })
  })
}

// Handle CORS headers and preflight requests
export function handleCorsAndPreflight(req: NextApiRequest, res: NextApiResponse): boolean {
  const origin = req.headers.origin as string;
  
  // ALWAYS send CORS headers
  res.setHeader('Access-Control-Allow-Origin', origin || '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Cross-Origin-Opener-Policy', 'unsafe-none');
  res.setHeader('Cross-Origin-Embedder-Policy', 'unsafe-none');
  
  // Handle preflight OPTIONS requests (MUST return BEFORE setting body)
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return true;
  }
  
  return false;
}

export default corsMiddleware
