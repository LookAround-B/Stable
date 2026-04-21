import prisma from '@/lib/prisma'
import { publishNotificationStates } from '@/lib/notificationRealtime'

const HORSE_FEED_NOTIFICATION_ROLES = [
  'Super Admin',
  'Director',
  'School Administrator',
  'Stable Manager',
  'Instructor',
] as const

const HORSE_FEED_SWEEP_COOLDOWN_MS = 60_000

let horseFeedNotificationSweepPromise: Promise<number> | null = null
let lastHorseFeedNotificationSweepAt = 0

const formatHorseFeedMenuEnd = (value: Date | null) => {
  if (!value) {
    return 'the scheduled end time'
  }

  return new Date(value).toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export const ensureExpiredHorseFeedMenuNotifications = async () => {
  const now = Date.now()

  if (horseFeedNotificationSweepPromise) {
    return horseFeedNotificationSweepPromise
  }

  if (now - lastHorseFeedNotificationSweepAt < HORSE_FEED_SWEEP_COOLDOWN_MS) {
    return 0
  }

  horseFeedNotificationSweepPromise = (async () => {
    const expiredMenuRecords = await prisma.horseFeed.findMany({
      where: {
        temporaryMenuName: { not: null },
        menuEndAt: { not: null, lte: new Date() },
        menuCompletionNotifiedAt: null,
      },
      include: {
        horse: {
          select: {
            id: true,
            name: true,
            stableNumber: true,
          },
        },
      },
      orderBy: { menuEndAt: 'asc' },
    })

    if (expiredMenuRecords.length === 0) {
      return 0
    }

    const managers = await prisma.employee.findMany({
      where: {
        designation: { in: [...HORSE_FEED_NOTIFICATION_ROLES] },
        employmentStatus: 'Active',
      },
      select: { id: true },
    })

    const notificationTime = new Date()
    const managerIds = managers.map((employee) => employee.id)
    const notifications = expiredMenuRecords.flatMap((record) => {
      const horseLabel = record.horse.stableNumber
        ? `${record.horse.name} (${record.horse.stableNumber})`
        : record.horse.name
      const menuLabel = record.temporaryMenuName || 'Temporary Menu'
      const endLabel = formatHorseFeedMenuEnd(record.menuEndAt)
      const recipients = Array.from(
        new Set<string>([...managerIds, record.recordedById])
      )

      return recipients.map((employeeId) => ({
        employeeId,
        type: 'horse_feed_menu_expired',
        title: `Horse feed menu period ended for ${horseLabel}`,
        message: `"${menuLabel}" ended on ${endLabel}. Review the horse feed menu if a new period is needed.`,
      }))
    })

    await prisma.$transaction([
      prisma.horseFeed.updateMany({
        where: {
          id: { in: expiredMenuRecords.map((record) => record.id) },
          menuCompletionNotifiedAt: null,
        },
        data: {
          menuCompletionNotifiedAt: notificationTime,
        },
      }),
      prisma.notification.createMany({
        data: notifications,
      }),
    ])

    await publishNotificationStates(notifications.map((item) => item.employeeId))

    return expiredMenuRecords.length
  })()

  try {
    return await horseFeedNotificationSweepPromise
  } finally {
    lastHorseFeedNotificationSweepAt = Date.now()
    horseFeedNotificationSweepPromise = null
  }
}
