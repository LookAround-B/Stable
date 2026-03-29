import type { NextApiRequest, NextApiResponse } from 'next'
import { setCorsHeaders } from '@/lib/cors'

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  const origin = req.headers.origin as string;
  
  setCorsHeaders(res, origin);
  
  if (req.method === 'OPTIONS') {
    console.log('[auth-test] Responding to OPTIONS preflight');
    return res.status(200).send('OK');
  }
  
  if (req.method === 'POST') {
    return res.status(200).json({ success: true, token: 'test-token' });
  }
  
  return res.status(405).json({ error: 'Method not allowed' });
}
