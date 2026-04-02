import type { NextApiResponse } from 'next'
import prisma from '@/lib/prisma'

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

declare global {
  // eslint-disable-next-line no-var
  var __efmNotificationStreams:
    | Map<string, Map<string, NotificationConnection>>
    | undefined
}

const notificationStreams =
  globalThis.__efmNotificationStreams ??
  (globalThis.__efmNotificationStreams = new Map<
    string,
    Map<string, NotificationConnection>
  >())

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

export const registerNotificationStream = (
  employeeId: string,
  res: NextApiResponse
) => {
  const connectionId = `${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 10)}`
  const bucket = getEmployeeConnections(employeeId)

  res.statusCode = 200
  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache, no-transform')
  res.setHeader('Connection', 'keep-alive')
  res.setHeader('X-Accel-Buffering', 'no')
  ;(res as any).flushHeaders?.()
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

export const publishNotificationState = async (employeeId: string) => {
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

export const publishNotificationStates = async (
  employeeIds: Iterable<string>
) => {
  const uniqueEmployeeIds = Array.from(
    new Set(Array.from(employeeIds).filter(Boolean))
  )

  await Promise.all(
    uniqueEmployeeIds.map((employeeId) => publishNotificationState(employeeId))
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

  await publishNotificationState(payload.employeeId)
  return notification
}
