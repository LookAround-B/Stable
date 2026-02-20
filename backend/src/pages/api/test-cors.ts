import type { NextApiRequest, NextApiResponse } from 'next'

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  console.log('[test-cors] Method:', req.method);
  
  // Use writeHead to explicitly set all headers
  res.writeHead(200, {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'X-Custom-Header': 'CORS-TEST',
    'Content-Type': 'text/plain'
  });
  
  if (req.method === 'OPTIONS') {
    res.end('OK');
    return;
  }
  
  res.end('test-cors works');
}
