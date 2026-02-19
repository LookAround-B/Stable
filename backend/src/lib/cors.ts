// CORS middleware for Next.js API routes
import { NextApiRequest, NextApiResponse } from 'next'
import cors from 'cors'

// Initialize the cors middleware
const corsMiddleware = cors({
  origin: process.env.CORS_ORIGIN 
    ? process.env.CORS_ORIGIN.split(',')
    : [
        'http://localhost:3001',
        'http://localhost:3002',
        'http://localhost:3000',
        'https://horsestable04.vercel.app',
        'https://horsestable-frontend.vercel.app',
        process.env.FRONTEND_URL
      ].filter(Boolean),
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
})

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

export default corsMiddleware
