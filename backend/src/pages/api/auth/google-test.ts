import type { NextApiRequest, NextApiResponse } from 'next'

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  const origin = req.headers.origin as string;
  
  console.log('[auth-test] Method:', req.method, 'Origin:', origin);
  
  // Set headers FIRST thing
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  // No COOP for now
  
  if (req.method === 'OPTIONS') {
    console.log('[auth-test] Responding to OPTIONS preflight');
    return res.status(200).send('OK');
  }
  
  if (req.method === 'POST') {
    return res.status(200).json({ success: true, token: 'test-token' });
  }
  
  return res.status(405).json({ error: 'Method not allowed' });
}
