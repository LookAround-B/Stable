import type { NextApiRequest, NextApiResponse } from 'next'

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  console.log('[test-cors]', req.method, 'from:', req.headers.origin);
  
  // Set CORS headers FIRST, before anything else
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    console.log('[test-cors] Responding to OPTIONS');
    return res.status(200).send('OK');
  }
  
  res.status(200).json({ 
    message: 'CORS test endpoint',
    method: req.method,
    origin: req.headers.origin
  });
}
