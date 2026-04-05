import { createClient } from 'redis'

type AppRedisClient = ReturnType<typeof createClient>

declare global {
  // eslint-disable-next-line no-var
  var __efmRedisClient: AppRedisClient | undefined
  // eslint-disable-next-line no-var
  var __efmRedisSubscriber: AppRedisClient | undefined
  // eslint-disable-next-line no-var
  var __efmRedisClientPromise: Promise<AppRedisClient | null> | undefined
  // eslint-disable-next-line no-var
  var __efmRedisSubscriberPromise: Promise<AppRedisClient | null> | undefined
  // eslint-disable-next-line no-var
  var __efmRedisWarningIssued: boolean | undefined
}

const REDIS_URL = process.env.REDIS_URL?.trim() || ''
const REDIS_KEY_PREFIX = process.env.REDIS_KEY_PREFIX?.trim() || 'efm'

const warnRedisUnavailable = (message: string) => {
  if (globalThis.__efmRedisWarningIssued) {
    return
  }

  globalThis.__efmRedisWarningIssued = true
  console.warn(`[redis] ${message}`)
}

const attachErrorLogging = (client: AppRedisClient, label: string) => {
  client.on('error', (error) => {
    console.error(`[redis] ${label} error:`, error)
  })
}

const connectRedisClient = async (
  factory: () => AppRedisClient,
  label: string
): Promise<AppRedisClient | null> => {
  if (!REDIS_URL) {
    warnRedisUnavailable(
      'REDIS_URL is not configured. Redis cache and pub/sub are disabled.'
    )
    return null
  }

  try {
    const client = factory()
    attachErrorLogging(client, label)

    if (!client.isOpen) {
      await client.connect()
    }

    return client
  } catch (error) {
    console.error(`[redis] Failed to connect ${label}:`, error)
    return null
  }
}

export const isRedisEnabled = (): boolean => Boolean(REDIS_URL)

export const getRedisKeyPrefix = (): string => REDIS_KEY_PREFIX

export const getRedisClient = async (): Promise<AppRedisClient | null> => {
  if (globalThis.__efmRedisClient?.isOpen) {
    return globalThis.__efmRedisClient
  }

  if (!globalThis.__efmRedisClientPromise) {
    globalThis.__efmRedisClientPromise = connectRedisClient(() => {
      const client = createClient({ url: REDIS_URL })
      globalThis.__efmRedisClient = client
      return client
    }, 'client').finally(() => {
      globalThis.__efmRedisClientPromise = undefined
    })
  }

  return globalThis.__efmRedisClientPromise
}

export const getRedisSubscriber = async (): Promise<AppRedisClient | null> => {
  if (globalThis.__efmRedisSubscriber?.isOpen) {
    return globalThis.__efmRedisSubscriber
  }

  if (!globalThis.__efmRedisSubscriberPromise) {
    globalThis.__efmRedisSubscriberPromise = (async () => {
      const baseClient = await getRedisClient()
      if (!baseClient) {
        return null
      }

      return connectRedisClient(() => {
        const subscriber = baseClient.duplicate()
        globalThis.__efmRedisSubscriber = subscriber
        return subscriber
      }, 'subscriber')
    })().finally(() => {
      globalThis.__efmRedisSubscriberPromise = undefined
    })
  }

  return globalThis.__efmRedisSubscriberPromise
}
