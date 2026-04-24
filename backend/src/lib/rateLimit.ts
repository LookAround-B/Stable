/**
 * Redis-backed rate limiter with in-memory fallback.
 * Usage: const result = await rateLimit(req, { max: 10, windowSecs: 60 })
 * if (!result.allowed) return res.status(429).json({ error: 'Too many requests' })
 */
import { getRedisClient } from '@/lib/redis'

interface RateLimitOptions {
  /** Max requests allowed in the window */
  max: number
  /** Window size in seconds */
  windowSecs: number
  /** Key prefix to namespace different limiters */
  prefix?: string
}

interface RateLimitResult {
  allowed: boolean
  remaining: number
  resetAt: number // Unix timestamp (seconds)
}

// In-memory fallback when Redis is unavailable
const memoryStore = new Map<string, { count: number; resetAt: number }>()

function getClientIp(req: { headers: Record<string, string | string[] | undefined>; socket?: { remoteAddress?: string } }): string {
  const forwarded = req.headers['x-forwarded-for']
  if (forwarded) {
    const ip = Array.isArray(forwarded) ? forwarded[0] : forwarded.split(',')[0]
    return ip.trim()
  }
  return req.socket?.remoteAddress || 'unknown'
}

export async function rateLimit(
  req: { headers: Record<string, string | string[] | undefined>; socket?: { remoteAddress?: string } },
  options: RateLimitOptions
): Promise<RateLimitResult> {
  const { max, windowSecs, prefix = 'rl' } = options
  const ip = getClientIp(req)
  const key = `${prefix}:${ip}`
  const now = Math.floor(Date.now() / 1000)
  const resetAt = now + windowSecs

  try {
    const redis = await getRedisClient()

    if (redis) {
      // Redis path — atomic increment with expiry
      const redisKey = `efm:${key}`
      const count = await redis.incr(redisKey)
      if (count === 1) {
        await redis.expire(redisKey, windowSecs)
      }
      const ttl = await redis.ttl(redisKey)
      const allowed = count <= max
      return {
        allowed,
        remaining: Math.max(0, max - count),
        resetAt: now + ttl,
      }
    }
  } catch {
    // Fall through to in-memory
  }

  // In-memory fallback
  const existing = memoryStore.get(key)
  if (!existing || existing.resetAt <= now) {
    memoryStore.set(key, { count: 1, resetAt })
    return { allowed: true, remaining: max - 1, resetAt }
  }

  existing.count += 1
  const allowed = existing.count <= max
  return {
    allowed,
    remaining: Math.max(0, max - existing.count),
    resetAt: existing.resetAt,
  }
}
