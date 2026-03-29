import type { NextApiRequest, NextApiResponse } from 'next'
import { setCorsHeaders } from '@/lib/cors'

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  const origin = req.headers.origin
  setCorsHeaders(res, origin as string | undefined)

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  return res.status(200).json({ cors: 'ok' });
}
