import { getRedisClient, getRedisKeyPrefix } from '@/lib/redis'

const CACHE_PREFIX = `${getRedisKeyPrefix()}:cache`

const toCacheKeySuffix = (value?: unknown) => {
  if (value === undefined) {
    return ''
  }

  return Buffer.from(JSON.stringify(value)).toString('base64url')
}

export const buildCacheKey = (scope: string, value?: unknown) => {
  const suffix = toCacheKeySuffix(value)
  return suffix ? `${CACHE_PREFIX}:${scope}:${suffix}` : `${CACHE_PREFIX}:${scope}`
}

export const rememberJson = async <T>(
  key: string,
  ttlSeconds: number,
  loader: () => Promise<T>
): Promise<T> => {
  const client = await getRedisClient()

  if (client) {
    try {
      const cached = await client.get(key)
      if (cached !== null) {
        return JSON.parse(cached) as T
      }
    } catch (error) {
      console.error(`[cache] Failed to read ${key}:`, error)
    }
  }

  const value = await loader()

  if (client) {
    try {
      await client.set(key, JSON.stringify(value), { EX: ttlSeconds })
    } catch (error) {
      console.error(`[cache] Failed to write ${key}:`, error)
    }
  }

  return value
}

export const invalidateCacheKeys = async (...keys: Array<string | undefined>) => {
  const client = await getRedisClient()
  if (!client) {
    return
  }

  const validKeys = keys.filter((key): key is string => Boolean(key))
  if (validKeys.length === 0) {
    return
  }

  try {
    await client.del(validKeys)
  } catch (error) {
    console.error('[cache] Failed to invalidate cache keys:', error)
  }
}

export const invalidateCacheByPrefix = async (
  ...prefixes: Array<string | undefined>
) => {
  const client = await getRedisClient()
  if (!client) {
    return
  }

  const validPrefixes = prefixes.filter(
    (prefix): prefix is string => Boolean(prefix)
  )

  if (validPrefixes.length === 0) {
    return
  }

  try {
    for (const prefix of validPrefixes) {
      const keys: string[] = []
      for await (const key of client.scanIterator({
        MATCH: `${CACHE_PREFIX}:${prefix}*`,
        COUNT: 100,
      })) {
        keys.push(String(key))
      }

      if (keys.length > 0) {
        await client.del(keys)
      }
    }
  } catch (error) {
    console.error('[cache] Failed to invalidate cache prefixes:', error)
  }
}
