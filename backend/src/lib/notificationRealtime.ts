import type { NextApiResponse } from 'next'
import prisma from '@/lib/prisma'
import { invalidateNotificationsCache } from '@/lib/cacheKeys'
import {
  getRedisClient,
  getRedisKeyPrefix,
  getRedisSubscriber,
  isRedisEnabled,
} from '@/lib/redis'

type NotificationConnection = {
  res: NextApiResponse
  heartbeat: NodeJS.Timeout
}

type NotificationPayload = {
  employeeId: string
  type: string
  title: string
  message: string
  relatedTaskId?: string | null
  relatedApprovalId?: string | null
}

type NotificationBroadcastMessage = {
  employeeId: string
}

declare global {
  // eslint-disable-next-line no-var
  var __efmNotificationStreams:
    | Map<string, Map<string, NotificationConnection>>
    | undefined
  // eslint-disable-next-line no-var
  var __efmNotificationSubscriptionPromise: Promise<void> | undefined
}

const notificationStreams =
  globalThis.__efmNotificationStreams ??
  (globalThis.__efmNotificationStreams = new Map<
    string,
    Map<string, NotificationConnection>
  >())

const NOTIFICATION_CHANNEL = `${getRedisKeyPrefix()}:notifications`

const sendSseEvent = (
  res: NextApiResponse,
  event: string,
  data: unknown
) => {
  res.write(`event: ${event}\n`)
  res.write(`data: ${JSON.stringify(data)}\n\n`)
}

const getEmployeeConnections = (employeeId: string) => {
  let bucket = notificationStreams.get(employeeId)
  if (!bucket) {
    bucket = new Map<string, NotificationConnection>()
    notificationStreams.set(employeeId, bucket)
  }
  return bucket
}

const removeConnection = (employeeId: string, connectionId: string) => {
  const bucket = notificationStreams.get(employeeId)
  const connection = bucket?.get(connectionId)

  if (connection) {
    clearInterval(connection.heartbeat)
  }

  bucket?.delete(connectionId)

  if (bucket && bucket.size === 0) {
    notificationStreams.delete(employeeId)
  }
}

const buildNotificationState = async (employeeId: string) => {
  const [notifications, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where: { employeeId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    }),
    prisma.notification.count({
      where: { employeeId, isRead: false },
    }),
  ])

  return {
    notifications,
    unreadCount,
    sentAt: new Date().toISOString(),
  }
}

const publishNotificationStateToConnections = async (employeeId: string) => {
  const bucket = notificationStreams.get(employeeId)
  if (!bucket || bucket.size === 0) return

  const state = await buildNotificationState(employeeId)

  for (const [connectionId, connection] of bucket.entries()) {
    try {
      sendSseEvent(connection.res, 'notifications', state)
    } catch {
      removeConnection(employeeId, connectionId)
    }
  }
}

const handleBroadcastMessage = async (rawMessage: string) => {
  try {
    const payload = JSON.parse(rawMessage) as NotificationBroadcastMessage
    if (!payload.employeeId) {
      return
    }

    await publishNotificationStateToConnections(payload.employeeId)
  } catch (error) {
    console.error('[notifications] Failed to handle Redis broadcast:', error)
  }
}

const ensureNotificationSubscription = async () => {
  if (!isRedisEnabled()) {
    return
  }

  if (!globalThis.__efmNotificationSubscriptionPromise) {
    globalThis.__efmNotificationSubscriptionPromise = (async () => {
      const subscriber = await getRedisSubscriber()
      if (!subscriber) {
        return
      }

      await subscriber.subscribe(NOTIFICATION_CHANNEL, (message) => {
        void handleBroadcastMessage(message)
      })
    })().catch((error) => {
      console.error('[notifications] Failed to subscribe to Redis:', error)
    })
  }

  await globalThis.__efmNotificationSubscriptionPromise
}

const broadcastNotificationState = async (employeeId: string) => {
  await invalidateNotificationsCache(employeeId)

  const client = await getRedisClient()
  if (!client || !isRedisEnabled()) {
    await publishNotificationStateToConnections(employeeId)
    return
  }

  try {
    await client.publish(
      NOTIFICATION_CHANNEL,
      JSON.stringify({ employeeId } satisfies NotificationBroadcastMessage)
    )
  } catch (error) {
    console.error('[notifications] Failed to publish Redis event:', error)
    await publishNotificationStateToConnections(employeeId)
  }
}

export const registerNotificationStream = async (
  employeeId: string,
  res: NextApiResponse
) => {
  await ensureNotificationSubscription()

  const connectionId = `${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 10)}`
  const bucket = getEmployeeConnections(employeeId)

  res.statusCode = 200
  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache, no-transform')
  res.setHeader('Connection', 'keep-alive')
  res.setHeader('X-Accel-Buffering', 'no')
  ;(res as NextApiResponse & { flushHeaders?: () => void }).flushHeaders?.()
  res.socket?.setTimeout?.(0)
  res.socket?.setNoDelay?.(true)
  res.socket?.setKeepAlive?.(true)

  const cleanup = () => {
    removeConnection(employeeId, connectionId)
  }

  const heartbeat = setInterval(() => {
    try {
      sendSseEvent(res, 'ping', { ts: Date.now() })
    } catch {
      cleanup()
    }
  }, 25000)

  bucket.set(connectionId, { res, heartbeat })

  return cleanup
}

export const publishNotificationState = async (employeeId: string) => {
  await invalidateNotificationsCache(employeeId)
  await publishNotificationStateToConnections(employeeId)
}

export const publishNotificationStates = async (
  employeeIds: Iterable<string>
) => {
  const uniqueEmployeeIds = Array.from(
    new Set(Array.from(employeeIds).filter(Boolean))
  )

  await Promise.all(
    uniqueEmployeeIds.map((employeeId) => broadcastNotificationState(employeeId))
  )
}

export const createNotificationAndPublish = async (
  payload: NotificationPayload
) => {
  const notification = await prisma.notification.create({
    data: {
      employeeId: payload.employeeId,
      type: payload.type,
      title: payload.title,
      message: payload.message,
      relatedTaskId: payload.relatedTaskId ?? null,
      relatedApprovalId: payload.relatedApprovalId ?? null,
    },
  })

  await publishNotificationStates([payload.employeeId])
  return notification
}
