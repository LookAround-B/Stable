import type { NextApiRequest, NextApiResponse } from 'next'
import {
  checkPermission,
  getTaskCapabilitiesForUser,
  getTokenFromRequest,
  verifyToken,
} from '@/lib/auth'
import { rememberJson } from '@/lib/cache'
import {
  cacheKeys,
  CACHE_TTL_SECONDS,
  invalidateTaskCaches,
} from '@/lib/cacheKeys'
import prisma from '@/lib/prisma'
import { setCorsHeaders } from '@/lib/cors'
import { taskDetailSelect, taskListSelect } from '@/lib/taskPayload'
import {
  sanitizeString,
  isValidString,
  isValidId,
  isOneOf,
  isValidPhone,
  safeDate,
} from '@/lib/validate'
import {
  createNotificationAndPublish,
  publishNotificationStates,
} from '@/lib/notificationRealtime'
import {
  buildAccommodationNotificationMessage,
  buildAccommodationTaskName,
  buildBookingNotificationMessage,
  buildBookingTaskName,
  getBookingSlotTime,
  isAccommodationTaskType,
  isBookingTaskType,
  isTaskBookingType,
  isValidBookingCategory,
  isValidBookingDestination,
  isValidBookingSlot,
  isValidPaymentSource,
  resolveBookingRideType,
} from '@/lib/taskBookings'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const origin = req.headers.origin
  setCorsHeaders(res, origin as string | undefined)

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  const token = getTokenFromRequest(req as any)
  if (!token || !verifyToken(token)) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  switch (req.method) {
    case 'GET':
      return handleGetTask(req, res)
    case 'PATCH':
      return handleUpdateTask(req, res)
    case 'DELETE':
      return handleDeleteTask(req, res)
    default:
      return res.status(405).json({ error: 'Method not allowed' })
  }
}

async function handleGetTask(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { id } = req.query

    const taskId = Array.isArray(id) ? id[0] : id
    if (!taskId) {
      return res.status(400).json({ error: 'Task ID is required' })
    }

    const task = await rememberJson(
      cacheKeys.taskDetail(taskId),
      CACHE_TTL_SECONDS.taskDetail,
      () =>
        prisma.task.findUnique({
          where: { id: taskId },
          select: taskDetailSelect,
        })
    )

    if (!task) {
      return res.status(404).json({ error: 'Task not found' })
    }

    return res.status(200).json(task)
  } catch (error) {
    console.error('Error fetching task:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}

async function handleUpdateTask(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { id } = req.query
    const {
      status,
      completionNotes,
      photoUrl,
      name,
      type,
      horseId,
      instructorId,
      assignedEmployeeId,
      scheduledTime,
      priority,
      requiredProof,
      description,
      customerName,
      customerPhone,
      paymentSource,
      leadGroomName,
      leadPrice,
      totalRoomPrice,
      isPaid,
      isMembershipBooking,
      packageName,
      packageRideCount,
      packageMemberCount,
      packagePrice,
      gstAmount,
      bookingCategory,
      bookingRideType,
      bookingDestination,
      bookingSlot,
      accommodationCheckIn,
      accommodationCheckOut,
    } = req.body
    const token = getTokenFromRequest(req as any)

    if (!token) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    const decoded = verifyToken(token)
    const userId = decoded?.id

    if (!id || !isValidId(id as string)) {
      return res.status(400).json({ error: 'Valid Task ID is required' })
    }

    const validStatuses = [
      'Pending',
      'In Progress',
      'Completed',
      'Pending Review',
      'Approved',
      'Rejected',
      'Cancelled',
    ] as const

    if (status && !isOneOf(status, validStatuses)) {
      return res.status(400).json({ error: 'Invalid status' })
    }
    if (completionNotes && !isValidString(completionNotes, 0, 2000)) {
      return res
        .status(400)
        .json({ error: 'Completion notes must be max 2000 chars' })
    }
    if (photoUrl && typeof photoUrl === 'string' && photoUrl.length > 2000) {
      return res.status(400).json({ error: 'Photo URL too long' })
    }

    if (!decoded || !userId) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    const existingTask = await prisma.task.findUnique({
      where: { id: id as string },
      select: {
        id: true,
        name: true,
        type: true,
        status: true,
        horseId: true,
        instructorId: true,
        scheduledTime: true,
        priority: true,
        requiredProof: true,
        customerName: true,
        customerPhone: true,
        paymentSource: true,
        leadGroomName: true,
        leadPrice: true,
        totalRoomPrice: true,
        isPaid: true,
        isMembershipBooking: true,
        packageName: true,
        packageRideCount: true,
        packageMemberCount: true,
        packagePrice: true,
        gstAmount: true,
        bookingCategory: true,
        bookingRideType: true,
        bookingDestination: true,
        bookingSlot: true,
        accommodationCheckIn: true,
        accommodationCheckOut: true,
        description: true,
        assignedEmployeeId: true,
        createdById: true,
        horse: {
          select: {
            id: true,
            name: true,
          },
        },
        instructor: {
          select: {
            id: true,
            fullName: true,
            designation: true,
          },
        },
        assignedEmployee: {
          select: {
            id: true,
            fullName: true,
            designation: true,
          },
        },
        createdBy: {
          select: {
            id: true,
            fullName: true,
          },
        },
      },
    })

    if (!existingTask) {
      return res.status(404).json({ error: 'Task not found' })
    }

    const canManageSchedules = await checkPermission(decoded, 'manageSchedules')
    const taskCapabilities = await getTaskCapabilitiesForUser(
      decoded.id,
      decoded.designation
    )
    const canCreateTasks =
      canManageSchedules || taskCapabilities.canCreateTasks
    const canManageBookings =
      canManageSchedules || taskCapabilities.canManageBookings
    const canReviewTasks =
      canManageSchedules || taskCapabilities.canReviewTasks
    const canWorkOnAssignedTasks =
      canManageSchedules || taskCapabilities.canWorkOnAssignedTasks
    const isAssignedEmployee = existingTask.assignedEmployeeId === userId
    const hasTaskFieldUpdates =
      name !== undefined ||
      type !== undefined ||
      horseId !== undefined ||
      instructorId !== undefined ||
      assignedEmployeeId !== undefined ||
      scheduledTime !== undefined ||
      priority !== undefined ||
      requiredProof !== undefined ||
      description !== undefined ||
      customerName !== undefined ||
      customerPhone !== undefined ||
      paymentSource !== undefined ||
      leadGroomName !== undefined ||
      leadPrice !== undefined ||
      isMembershipBooking !== undefined ||
      packageName !== undefined ||
      packageRideCount !== undefined ||
      packageMemberCount !== undefined ||
      packagePrice !== undefined ||
      gstAmount !== undefined ||
      bookingCategory !== undefined ||
      bookingRideType !== undefined ||
      bookingDestination !== undefined ||
      bookingSlot !== undefined ||
      accommodationCheckIn !== undefined ||
      accommodationCheckOut !== undefined ||
      totalRoomPrice !== undefined ||
      isPaid !== undefined
    const requestedStatus =
      status === 'Completed' || status === 'Pending Review'
        ? 'Pending Review'
        : status

    if (!requestedStatus) {
      if (!hasTaskFieldUpdates) {
        return res.status(400).json({ error: 'Status is required' })
      }
    }

    const nextType = typeof type === 'string' ? type : existingTask.type
    const isRideBookingTask = isBookingTaskType(nextType)
    const isAccommodationBookingTask = isAccommodationTaskType(nextType)
    const isAnyBookingTask = isTaskBookingType(nextType)
    const canEditBookingFields =
      isAnyBookingTask &&
      canManageBookings &&
      existingTask.createdById === userId

    if (hasTaskFieldUpdates && !(canCreateTasks || canEditBookingFields)) {
      return res.status(403).json({
        error: isAnyBookingTask
          ? 'Booking editing is not enabled for your account.'
          : 'Task editing is not enabled for your account.',
      })
    }

    if (
      isAnyBookingTask &&
      requestedStatus &&
      !['Pending', 'Cancelled'].includes(requestedStatus)
    ) {
      return res.status(400).json({
        error: 'Bookings can only be updated or cancelled.',
      })
    }

    if (requestedStatus === 'In Progress') {
      if (!isAssignedEmployee || !canWorkOnAssignedTasks) {
        return res.status(403).json({
          error: 'Only the assigned employee can start this task.',
        })
      }

      if (existingTask.status !== 'Pending') {
        return res.status(400).json({
          error: `Task cannot be started while it is "${existingTask.status}".`,
        })
      }
    }

    if (requestedStatus === 'Pending') {
      if (!isAssignedEmployee || !canWorkOnAssignedTasks) {
        return res.status(403).json({
          error: 'Only the assigned employee can reset this task.',
        })
      }

      if (existingTask.status !== 'In Progress') {
        return res.status(400).json({
          error: 'Only in-progress tasks can be moved back to pending.',
        })
      }
    }

    if (requestedStatus === 'Pending Review') {
      if (!isAssignedEmployee || !canWorkOnAssignedTasks) {
        return res.status(403).json({
          error:
            'Only the assigned employee can submit this task for approval.',
        })
      }

      if (existingTask.status !== 'In Progress') {
        return res.status(400).json({
          error: 'Task must be in progress before submission.',
        })
      }

      if (existingTask.requiredProof && !photoUrl) {
        return res.status(400).json({
          error: 'Photo evidence is required for this task.',
        })
      }
    }

    if (requestedStatus === 'Approved' || requestedStatus === 'Rejected') {
      if (!canReviewTasks) {
        return res.status(403).json({
          error: 'Task review is not enabled for your account.',
        })
      }

      if (
        existingTask.status !== 'Pending Review' &&
        existingTask.status !== 'Completed'
      ) {
        return res.status(400).json({
          error: 'Only submitted tasks can be approved or rejected.',
        })
      }
    }

    if (
      requestedStatus === 'Cancelled' &&
      !(canCreateTasks || canEditBookingFields)
    ) {
      return res.status(403).json({
        error: isAnyBookingTask
          ? 'Booking cancellation is not enabled for your account.'
          : 'Task cancellation is not enabled for your account.',
      })
    }

    const updateData: Record<string, unknown> = {}
    let nextAssignedEmployeeId = existingTask.assignedEmployeeId
    let nextHorseName = existingTask.horse?.name || ''
    let nextInstructorName = existingTask.instructor?.fullName || ''
    let nextCustomerName = existingTask.customerName || ''
    let nextCustomerPhone = existingTask.customerPhone || ''
    let nextPaymentSource = existingTask.paymentSource || ''
    let nextLeadGroomName = existingTask.leadGroomName || ''
    let nextLeadPrice = existingTask.leadPrice
    let nextTotalRoomPrice = existingTask.totalRoomPrice
    let nextIsPaid = existingTask.isPaid
    let nextAccommodationCheckIn = existingTask.accommodationCheckIn
    let nextAccommodationCheckOut = existingTask.accommodationCheckOut
    let nextBookingCategory = existingTask.bookingCategory
    let nextBookingRideType = existingTask.bookingRideType
    let nextBookingDestination = existingTask.bookingDestination
    let nextBookingSlot = existingTask.bookingSlot
    let nextScheduledTime = existingTask.scheduledTime

    if (hasTaskFieldUpdates) {
      if (
        typeof nextType !== 'string' ||
        nextType.trim().length < 1 ||
        nextType.length > 100
      ) {
        return res
          .status(400)
          .json({ error: 'Task type must be 1-100 characters' })
      }

      const nextPriority = priority ?? existingTask.priority
      const validPriorities = ['Low', 'Medium', 'High', 'Urgent']
      if (nextPriority && !validPriorities.includes(nextPriority)) {
        return res
          .status(400)
          .json({ error: `Priority must be one of: ${validPriorities.join(', ')}` })
      }

      if (
        description !== undefined &&
        description &&
        !isValidString(description, 0, 2000)
      ) {
        return res
          .status(400)
          .json({ error: 'Description must be under 2000 characters' })
      }

      if (
        name !== undefined &&
        !isAnyBookingTask &&
        (!isValidString(name, 1, 200) || typeof name !== 'string')
      ) {
        return res
          .status(400)
          .json({ error: 'Task name must be 1-200 characters' })
      }

      if (scheduledTime !== undefined) {
        const parsedScheduled = new Date(scheduledTime)
        if (Number.isNaN(parsedScheduled.getTime())) {
          return res.status(400).json({ error: 'Invalid scheduledTime date' })
        }
        nextScheduledTime = parsedScheduled
      }

      const nextHorseId =
        horseId !== undefined
          ? horseId && typeof horseId === 'string' && horseId.trim()
            ? horseId
            : null
          : existingTask.horseId
      const nextInstructorId =
        instructorId !== undefined
          ? instructorId && typeof instructorId === 'string' && instructorId.trim()
            ? instructorId
            : null
          : existingTask.instructorId
      nextAssignedEmployeeId =
        assignedEmployeeId !== undefined
          ? assignedEmployeeId
          : existingTask.assignedEmployeeId

      nextCustomerName =
        customerName !== undefined ? sanitizeString(customerName) : existingTask.customerName || ''
      nextCustomerPhone =
        customerPhone !== undefined ? sanitizeString(customerPhone) : existingTask.customerPhone || ''
      nextPaymentSource =
        paymentSource !== undefined ? sanitizeString(paymentSource) : existingTask.paymentSource || ''
      nextLeadGroomName =
        leadGroomName !== undefined
          ? sanitizeString(leadGroomName)
          : existingTask.leadGroomName || ''
      nextLeadPrice =
        leadPrice !== undefined
          ? leadPrice === null || leadPrice === ''
            ? null
            : Number(leadPrice)
          : existingTask.leadPrice
      nextTotalRoomPrice =
        totalRoomPrice !== undefined
          ? totalRoomPrice === null || totalRoomPrice === ''
            ? null
            : Number(totalRoomPrice)
          : nextTotalRoomPrice
      nextIsPaid =
        isPaid !== undefined
          ? isPaid === true || isPaid === 'true'
          : nextIsPaid

      if (
        nextLeadPrice !== null &&
        (!Number.isFinite(nextLeadPrice) || nextLeadPrice < 0)
      ) {
        return res.status(400).json({
          error: 'Lead price must be a valid non-negative number or empty',
        })
      }

      let parsedCheckIn = existingTask.accommodationCheckIn
      if (accommodationCheckIn !== undefined) {
        if (accommodationCheckIn === null || accommodationCheckIn === '') {
          parsedCheckIn = null
        } else {
          parsedCheckIn = safeDate(accommodationCheckIn)
          if (!parsedCheckIn) {
            return res.status(400).json({
              error: 'Check-in must be a valid timestamp',
            })
          }
        }
      }

      let parsedCheckOut = existingTask.accommodationCheckOut
      if (accommodationCheckOut !== undefined) {
        if (accommodationCheckOut === null || accommodationCheckOut === '') {
          parsedCheckOut = null
        } else {
          parsedCheckOut = safeDate(accommodationCheckOut)
          if (!parsedCheckOut) {
            return res.status(400).json({
              error: 'Check-out must be a valid timestamp',
            })
          }
        }
      }

      nextAccommodationCheckIn = parsedCheckIn
      nextAccommodationCheckOut = parsedCheckOut

      const [assignedEmployee, horse, instructor] = await Promise.all([
        prisma.employee.findUnique({
          where: { id: nextAssignedEmployeeId },
          select: { id: true, fullName: true, designation: true },
        }),
        nextHorseId
          ? prisma.horse.findUnique({
              where: { id: nextHorseId },
              select: { id: true, name: true },
            })
          : Promise.resolve(null),
        nextInstructorId
          ? prisma.employee.findUnique({
              where: { id: nextInstructorId },
              select: { id: true, fullName: true, designation: true },
            })
          : Promise.resolve(null),
      ])

      if (!assignedEmployee) {
        return res.status(400).json({ error: 'Assigned employee not found' })
      }

      if (nextHorseId && !horse) {
        return res.status(400).json({ error: 'Selected horse was not found' })
      }

      if (isAnyBookingTask) {
        if (!isValidString(nextCustomerName, 1, 200)) {
          return res.status(400).json({
            error: 'Customer name is required for bookings',
          })
        }
        if (!isValidPhone(nextCustomerPhone)) {
          return res.status(400).json({
            error: 'Valid customer phone number is required for bookings',
          })
        }
        if (!isValidPaymentSource(nextPaymentSource)) {
          return res.status(400).json({
            error: 'Valid payment source is required for bookings',
          })
        }
        if (nextLeadGroomName && !isValidString(nextLeadGroomName, 0, 200)) {
          return res.status(400).json({
            error: 'Lead/Groom Name must be under 200 characters',
          })
        }
      }

      const membershipEnabled = isRideBookingTask
        ? isMembershipBooking !== undefined
          ? isMembershipBooking === true || isMembershipBooking === 'true'
          : existingTask.isMembershipBooking
        : false

      if (isRideBookingTask) {
        nextBookingCategory =
          bookingCategory !== undefined ? bookingCategory : existingTask.bookingCategory
        nextBookingDestination =
          bookingDestination !== undefined
            ? bookingDestination
            : existingTask.bookingDestination
        nextBookingSlot =
          bookingSlot !== undefined ? bookingSlot : existingTask.bookingSlot

        if (!nextHorseId) {
          return res
            .status(400)
            .json({ error: 'Horse is required for riding bookings' })
        }
        if (nextInstructorId && (!instructor || instructor.designation !== 'Instructor')) {
          return res.status(400).json({ error: 'Selected instructor is invalid' })
        }
        if (assignedEmployee.designation !== 'Jamedar') {
          return res
            .status(400)
            .json({ error: 'Riding bookings must be assigned to a Jamedar' })
        }
        if (!isValidBookingCategory(nextBookingCategory)) {
          return res.status(400).json({ error: 'Invalid booking category' })
        }
        if (!isValidBookingSlot(nextBookingSlot)) {
          return res.status(400).json({ error: 'Invalid booking slot' })
        }
        if (
          nextBookingCategory === 'Fun Rides' &&
          !isValidBookingDestination(nextBookingDestination)
        ) {
          return res.status(400).json({
            error: 'Fun rides require a valid inside/outside destination',
          })
        }

        nextBookingRideType = resolveBookingRideType(
          nextBookingCategory as string,
          bookingRideType !== undefined
            ? bookingRideType
            : existingTask.bookingRideType
        )
        if (!nextBookingRideType) {
          return res
            .status(400)
            .json({ error: 'Invalid ride type for the selected booking category' })
        }
        if (!getBookingSlotTime(nextBookingSlot as string)) {
          return res.status(400).json({ error: 'Invalid booking slot time' })
        }

        const conflictingBooking = await prisma.task.findFirst({
          where: {
            id: {
              not: id as string,
            },
            type: nextType,
            horseId: nextHorseId,
            scheduledTime: nextScheduledTime,
            status: {
              not: 'Cancelled',
            },
          },
          select: {
            id: true,
          },
        })

        if (conflictingBooking) {
          return res.status(400).json({
            error: `This horse is already booked at ${nextScheduledTime.toLocaleString('en-IN')}. Please choose another horse or time.`,
          })
        }

        const normalizedBookingCategory = nextBookingCategory as string
        const normalizedBookingRideType = nextBookingRideType as string
        const normalizedBookingDestination =
          normalizedBookingCategory === 'Fun Rides'
            ? (nextBookingDestination as string)
            : null
        const normalizedBookingSlot = nextBookingSlot as string

        nextHorseName = horse!.name
        nextInstructorName = instructor?.fullName || ''
        updateData.name = buildBookingTaskName({
          bookingRideType: normalizedBookingRideType,
          horseName: nextHorseName,
          bookingDestination: normalizedBookingDestination,
          bookingSlot: normalizedBookingSlot,
        })
        if (membershipEnabled) {
          const rideCount = Number(
            packageRideCount !== undefined
              ? packageRideCount
              : existingTask.packageRideCount
          )
          const memberCount = Number(
            packageMemberCount !== undefined
              ? packageMemberCount
              : existingTask.packageMemberCount
          )
          const totalPrice = Number(
            packagePrice !== undefined ? packagePrice : existingTask.packagePrice
          )
          const gstValue = Number(
            gstAmount !== undefined ? gstAmount : existingTask.gstAmount
          )
          const nextPackageName =
            packageName !== undefined
              ? sanitizeString(packageName)
              : existingTask.packageName || ''

          if (!isValidString(nextPackageName, 1, 200)) {
            return res.status(400).json({
              error: 'Package name is required for membership bookings',
            })
          }
          if (!Number.isFinite(rideCount) || rideCount < 1) {
            return res.status(400).json({
              error: 'Package ride count must be at least 1',
            })
          }
          if (!Number.isFinite(memberCount) || memberCount < 1) {
            return res.status(400).json({
              error: 'Member count must be at least 1',
            })
          }
          if (!Number.isFinite(totalPrice) || totalPrice < 0) {
            return res.status(400).json({
              error: 'Package price must be a valid number',
            })
          }
          if (!Number.isFinite(gstValue) || gstValue < 0) {
            return res.status(400).json({
              error: 'GST amount must be a valid number',
            })
          }

          updateData.isMembershipBooking = true
          updateData.packageName = nextPackageName
          updateData.packageRideCount = rideCount
          updateData.packageMemberCount = memberCount
          updateData.packagePrice = totalPrice
          updateData.gstAmount = gstValue
        } else {
          updateData.isMembershipBooking = false
          updateData.packageName = null
          updateData.packageRideCount = null
          updateData.packageMemberCount = null
          updateData.packagePrice = null
          updateData.gstAmount = null
        }

        updateData.bookingCategory = normalizedBookingCategory
        updateData.bookingRideType = normalizedBookingRideType
        updateData.bookingDestination = normalizedBookingDestination
        updateData.bookingSlot = normalizedBookingSlot
        updateData.instructorId = nextInstructorId
        updateData.customerName = nextCustomerName
        updateData.customerPhone = nextCustomerPhone
        updateData.paymentSource = nextPaymentSource
        updateData.leadGroomName = nextLeadGroomName || null
        updateData.leadPrice = nextLeadPrice
        updateData.totalRoomPrice = nextTotalRoomPrice
        updateData.isPaid = nextIsPaid
        updateData.accommodationCheckIn = null
        updateData.accommodationCheckOut = null
      } else if (isAccommodationBookingTask) {
        if (assignedEmployee.designation !== 'Housekeeping') {
          return res.status(400).json({
            error: 'Accommodation bookings must be assigned to Housekeeping',
          })
        }
        if (!nextAccommodationCheckIn || !nextAccommodationCheckOut) {
          return res.status(400).json({
            error: 'Valid check-in and check-out timestamps are required',
          })
        }
        if (nextAccommodationCheckOut <= nextAccommodationCheckIn) {
          return res.status(400).json({
            error: 'Check-out must be after check-in',
          })
        }

        updateData.name = buildAccommodationTaskName({
          customerName: nextCustomerName,
          checkIn: nextAccommodationCheckIn,
        })
        updateData.horseId = null
        updateData.instructorId = null
        updateData.bookingCategory = null
        updateData.bookingRideType = null
        updateData.bookingDestination = null
        updateData.bookingSlot = null
        updateData.customerName = nextCustomerName
        updateData.customerPhone = nextCustomerPhone
        updateData.paymentSource = nextPaymentSource
        updateData.leadGroomName = null
        updateData.leadPrice = nextLeadPrice
        updateData.totalRoomPrice = nextTotalRoomPrice
        updateData.isPaid = nextIsPaid
        updateData.isMembershipBooking = false
        updateData.packageName = null
        updateData.packageRideCount = null
        updateData.packageMemberCount = null
        updateData.packagePrice = null
        updateData.gstAmount = null
        updateData.accommodationCheckIn = nextAccommodationCheckIn
        updateData.accommodationCheckOut = nextAccommodationCheckOut
      } else {
        updateData.name =
          name !== undefined ? sanitizeString(name) : existingTask.name
        updateData.customerName = null
        updateData.customerPhone = null
        updateData.paymentSource = null
        updateData.leadGroomName = null
        updateData.leadPrice = null
        updateData.totalRoomPrice = null
        updateData.isPaid = false
        updateData.isMembershipBooking = false
        updateData.packageName = null
        updateData.packageRideCount = null
        updateData.packageMemberCount = null
        updateData.packagePrice = null
        updateData.gstAmount = null
        updateData.bookingCategory = null
        updateData.bookingRideType = null
        updateData.bookingDestination = null
        updateData.bookingSlot = null
        updateData.instructorId = null
        updateData.accommodationCheckIn = null
        updateData.accommodationCheckOut = null
      }

      updateData.type = sanitizeString(nextType)
      if (!isAccommodationBookingTask) {
        updateData.horseId = nextHorseId
      }
      updateData.assignedEmployeeId = nextAssignedEmployeeId
      updateData.scheduledTime = nextScheduledTime
      updateData.priority = nextPriority
      updateData.requiredProof =
        isAnyBookingTask
          ? false
          : requiredProof !== undefined
            ? requiredProof === true || requiredProof === 'true'
            : existingTask.requiredProof
      if (description !== undefined) {
        updateData.description = description
          ? sanitizeString(description)
          : null
      }
    }
    if (requestedStatus) updateData.status = requestedStatus
    if (completionNotes) {
      updateData.completionNotes = sanitizeString(completionNotes)
    }
    if (photoUrl) updateData.proofImage = photoUrl
    if (requestedStatus === 'Pending Review') {
      updateData.submittedAt = new Date()
      updateData.completedTime = new Date()
    }

    const task = await prisma.task.update({
      where: { id: id as string },
      data: updateData,
      select: taskListSelect,
    })

    let responseTask: any = task
    let clearedNotificationRecipients: string[] = []

    if ((requestedStatus === 'Approved' || requestedStatus === 'Rejected') && userId) {
      clearedNotificationRecipients = (
        await prisma.notification.findMany({
          where: {
            relatedTaskId: id as string,
            type: 'task_completion',
            isRead: false,
          },
          select: { employeeId: true },
        })
      ).map((notification) => notification.employeeId)

      await prisma.approval.upsert({
        where: {
          taskId_approverId: {
            taskId: id as string,
            approverId: userId,
          },
        },
        update: {
          status: requestedStatus === 'Approved' ? 'Approved' : 'Rejected',
        },
        create: {
          taskId: id as string,
          approverId: userId,
          status: requestedStatus === 'Approved' ? 'Approved' : 'Rejected',
          approverLevel: 'Admin',
        },
      })

      responseTask = await prisma.task.findUnique({
        where: { id: id as string },
        select: taskListSelect,
      })
    }

    if (requestedStatus === 'Pending Review') {
      try {
        const employeeName =
          existingTask.assignedEmployee?.fullName || 'An employee'
        await createNotificationAndPublish({
          employeeId: existingTask.createdById,
          type: 'task_completion',
          title: `Task submitted for review: ${existingTask.name}`,
          message: `${employeeName} has completed "${existingTask.name}" and submitted it for your approval.`,
          relatedTaskId: id as string,
        })
      } catch (notifErr) {
        console.error(
          '[NOTIF] Failed to create task completion notification:',
          notifErr
        )
      }
    }

    if (
      isAnyBookingTask &&
      (hasTaskFieldUpdates || requestedStatus === 'Cancelled')
    ) {
      const bookingNotificationTargets = new Set<string>([
        nextAssignedEmployeeId,
      ])

      if (
        existingTask.assignedEmployeeId &&
        existingTask.assignedEmployeeId !== nextAssignedEmployeeId
      ) {
        bookingNotificationTargets.add(existingTask.assignedEmployeeId)
      }

      const action =
        requestedStatus === 'Cancelled' ? 'cancelled' : 'updated'
      const notificationTitle =
        action === 'cancelled'
          ? `${isAccommodationBookingTask ? 'Accommodation booking' : 'Booking'} cancelled: ${responseTask?.name || existingTask.name}`
          : `${isAccommodationBookingTask ? 'Accommodation booking' : 'Booking'} updated: ${responseTask?.name || existingTask.name}`

      for (const employeeId of bookingNotificationTargets) {
        const isPreviousAssignee =
          employeeId === existingTask.assignedEmployeeId &&
          existingTask.assignedEmployeeId !== nextAssignedEmployeeId

        await createNotificationAndPublish({
          employeeId,
          type: isPreviousAssignee ? 'general' : 'task_assignment',
          title: notificationTitle,
          message: isPreviousAssignee
            ? `This ${isAccommodationBookingTask ? 'accommodation booking' : 'riding booking'} has been reassigned away from you: ${responseTask?.name || existingTask.name}.`
            : isAccommodationBookingTask
              ? buildAccommodationNotificationMessage({
                  action,
                  customerName: nextCustomerName,
                  customerPhone: nextCustomerPhone,
                  paymentSource: nextPaymentSource,
                  checkIn: nextAccommodationCheckIn!,
                  checkOut: nextAccommodationCheckOut!,
                })
              : buildBookingNotificationMessage({
                  action,
                  horseName: nextHorseName,
                  instructorName: nextInstructorName || null,
                  bookingCategory: nextBookingCategory || 'Normal Riding',
                  bookingRideType: nextBookingRideType || (nextBookingCategory || 'Normal Riding'),
                  bookingDestination: nextBookingDestination,
                  bookingSlot: nextBookingSlot || '',
                  scheduledDate: nextScheduledTime,
                }),
          relatedTaskId: id as string,
        })
      }
    }

    if (requestedStatus === 'Approved' || requestedStatus === 'Rejected') {
      try {
        await prisma.notification.updateMany({
          where: {
            relatedTaskId: id as string,
            type: 'task_completion',
            isRead: false,
          },
          data: { isRead: true, readAt: new Date() },
        })

        await publishNotificationStates(clearedNotificationRecipients)

        const employeeMsg =
          requestedStatus === 'Approved'
            ? `Your task "${task.name}" has been approved. Great work!`
            : `Your task "${task.name}" was rejected. Please check with your supervisor.`

        await createNotificationAndPublish({
          employeeId: task.assignedEmployeeId,
          type: requestedStatus === 'Approved' ? 'approval_request' : 'general',
          title: `Task ${requestedStatus}: ${task.name}`,
          message: employeeMsg,
          relatedTaskId: id as string,
        })
      } catch (notifErr) {
        console.error(
          '[NOTIF] Failed to handle approval notifications:',
          notifErr
        )
      }
    }

    await invalidateTaskCaches(id as string)

    return res.status(200).json(responseTask || task)
  } catch (error) {
    console.error('Error updating task:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}

async function handleDeleteTask(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { id } = req.query

    if (!id) {
      return res.status(400).json({ error: 'Task ID is required' })
    }

    const token = getTokenFromRequest(req as any)
    if (!token) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    const decoded = verifyToken(token)
    if (!decoded) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    const canManageSchedules = await checkPermission(decoded, 'manageSchedules')
    const taskCapabilities = await getTaskCapabilitiesForUser(
      decoded.id,
      decoded.designation
    )

    if (!canManageSchedules && !taskCapabilities.canCreateTasks) {
      return res.status(403).json({
        error: 'Task deletion is not enabled for your account.',
      })
    }

    await prisma.task.delete({
      where: { id: id as string },
    })

    await invalidateTaskCaches(id as string)

    return res.status(200).json({ message: 'Task deleted successfully' })
  } catch (error) {
    console.error('Error deleting task:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
