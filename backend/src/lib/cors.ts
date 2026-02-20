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
    'https://horsestable01.vercel.app',
    'https://horsestable-frontend.vercel.app',
    'https://horsestable04.vercel.app',
    'https://horsestablebackend.vercel.app',
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
  if (origin && allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  } else if (allowedOrigins.length > 0) {
    res.setHeader('Access-Control-Allow-Origin', allowedOrigins[0]);
  }
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
  const allowedOrigins = getAllowedOrigins();
  
  // Set CORS headers
  if (origin && allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  } else if (allowedOrigins.length > 0) {
    res.setHeader('Access-Control-Allow-Origin', allowedOrigins[0]);
  }
  
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Cross-Origin-Opener-Policy', 'unsafe-none');
  res.setHeader('Cross-Origin-Embedder-Policy', 'unsafe-none');
  
  // Handle preflight OPTIONS requests
  if (req.method === 'OPTIONS') {
    res.status(200).json({ ok: true });
    return true;
  }
  
  return false;
}

export default corsMiddleware
