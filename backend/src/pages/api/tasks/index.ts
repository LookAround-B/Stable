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
import { createNotificationAndPublish } from '@/lib/notificationRealtime'
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
import { taskListSelect } from '@/lib/taskPayload'
import { isValidPhone, isValidString, safeDate, safePositiveInt } from '@/lib/validate'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const origin = req.headers.origin
  setCorsHeaders(res, origin as string | undefined)

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  // Check authentication
  const token = getTokenFromRequest(req as any)
  if (!token || !verifyToken(token)) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  switch (req.method) {
    case 'GET':
      return handleGetTasks(req, res)
    case 'POST':
      return handleCreateTask(req, res)
    default:
      return res.status(405).json({ error: 'Method not allowed' })
  }
}

async function handleGetTasks(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { status, horseId, skip = 0, take = 10 } = req.query
    const token = getTokenFromRequest(req as any)
    if (!token) {
      return res.status(401).json({ error: 'Unauthorized' })
    }
    const decoded = verifyToken(token)
    const userId = decoded?.id

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' })
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
    const canViewAssignedTasks =
      canCreateTasks ||
      canManageBookings ||
      canReviewTasks ||
      taskCapabilities.canViewTasks ||
      taskCapabilities.canWorkOnAssignedTasks

    if (!canViewAssignedTasks) {
      return res.status(403).json({
        error:
          'Task access is not enabled for your account. Ask an admin to enable the required task overrides.',
      })
    }

    const statusValue = Array.isArray(status) ? status[0] : status
    const horseIdValue = Array.isArray(horseId) ? horseId[0] : horseId
    const skipValue = safePositiveInt(skip, 0, 10000)
    const takeValue = safePositiveInt(take, 10, 100)
    const where: any = {}
    if (statusValue) where.status = statusValue
    if (horseIdValue) where.horseId = horseIdValue

    if (statusValue === 'Pending Review' && canReviewTasks) {
      // Reviewers can see all pending submissions.
    } else if (canCreateTasks || canReviewTasks || canManageBookings) {
      where.OR = [
        { createdById: userId },
        { assignedEmployeeId: userId },
      ]
    } else {
      where.assignedEmployeeId = userId
    }

    const payload = await rememberJson(
      cacheKeys.tasksList(userId, {
        status: statusValue ?? null,
        horseId: horseIdValue ?? null,
        skip: skipValue,
        take: takeValue,
      }),
      CACHE_TTL_SECONDS.tasksList,
      async () => {
        const [tasks, total] = await Promise.all([
          prisma.task.findMany({
            where,
            skip: skipValue,
            take: takeValue,
            select: taskListSelect,
            orderBy: { scheduledTime: 'desc' },
          }),
          prisma.task.count({ where }),
        ])

        return {
          data: tasks,
          pagination: { total, skip: skipValue, take: takeValue },
        }
      }
    )

    return res.status(200).json(payload)
  } catch (error) {
    console.error('Error fetching tasks:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}

async function handleCreateTask(req: NextApiRequest, res: NextApiResponse) {
  try {
    const token = getTokenFromRequest(req as any)
    if (!token) {
      return res.status(401).json({ error: 'Unauthorized' })
    }
    const decoded = verifyToken(token)
    const userId = decoded?.id

    if (!userId || !decoded) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    const requestedType =
      typeof req.body?.type === 'string' ? req.body.type : ''
    const isRequestedBookingTask = isTaskBookingType(requestedType)

    try {
      const canManageSchedules = await checkPermission(decoded, 'manageSchedules')
      const taskCapabilities = await getTaskCapabilitiesForUser(
        decoded.id,
        decoded.designation
      )
      const allowed =
        canManageSchedules ||
        taskCapabilities.canCreateTasks ||
        (taskCapabilities.canManageBookings && isRequestedBookingTask)
      if (!allowed) {
        return res.status(403).json({
          error:
            isRequestedBookingTask
              ? 'Booking creation is not enabled for your account.'
              : 'Task creation is not enabled for your account. Ask an admin to enable task assignment access.',
        })
      }
    } catch (permErr) {
      console.error('Permission check failed:', permErr)
      return res.status(500).json({ error: 'Failed to verify permissions. Please try again.' })
    }

    const {
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

    if (!name || !type || !assignedEmployeeId || !scheduledTime) {
      if (!isTaskBookingType(type)) {
        return res.status(400).json({ error: 'Missing required fields: name, type, assignedEmployeeId, scheduledTime' })
      }
    }

    // Validate string fields
    if (!isTaskBookingType(type) && (typeof name !== 'string' || name.trim().length < 1 || name.length > 200)) {
      return res.status(400).json({ error: 'Task name must be 1-200 characters' })
    }
    if (typeof type !== 'string' || type.trim().length < 1 || type.length > 100) {
      return res.status(400).json({ error: 'Task type must be 1-100 characters' })
    }
    if (description && (typeof description !== 'string' || description.length > 2000)) {
      return res.status(400).json({ error: 'Description must be under 2000 characters' })
    }

    // Validate priority enum
    const validPriorities = ['Low', 'Medium', 'High', 'Urgent']
    if (priority && !validPriorities.includes(priority)) {
      return res.status(400).json({ error: `Priority must be one of: ${validPriorities.join(', ')}` })
    }

    // Validate date
    const parsedScheduled = new Date(scheduledTime)
    if (isNaN(parsedScheduled.getTime())) {
      return res.status(400).json({ error: 'Invalid scheduledTime date' })
    }

    const sanitize = (s: string) => s.replace(/<[^>]*>/g, '').trim()
    const isRideBookingTask = isBookingTaskType(type)
    const isAccommodationBookingTask = isAccommodationTaskType(type)
    const isAnyBookingTask = isTaskBookingType(type)
    const normalizedInstructorId =
      instructorId && typeof instructorId === 'string' && instructorId.trim()
        ? instructorId
        : null

    if (!isValidString(customerName, 1, 200) && isAnyBookingTask) {
      return res.status(400).json({ error: 'Customer name is required for bookings' })
    }
    if (!isValidPhone(customerPhone) && isAnyBookingTask) {
      return res.status(400).json({ error: 'Valid customer phone number is required for bookings' })
    }
    if (!isValidPaymentSource(paymentSource) && isAnyBookingTask) {
      return res.status(400).json({ error: 'Valid payment source is required for bookings' })
    }
    if (
      isRideBookingTask &&
      leadGroomName !== undefined &&
      leadGroomName !== null &&
      !isValidString(leadGroomName, 0, 200)
    ) {
      return res.status(400).json({ error: 'Lead/Groom Name must be under 200 characters' })
    }

    const parsedLeadPrice =
      leadPrice === undefined || leadPrice === null || leadPrice === ''
        ? null
        : Number(leadPrice)

    if (
      parsedLeadPrice !== null &&
      (!Number.isFinite(parsedLeadPrice) || parsedLeadPrice < 0)
    ) {
      return res.status(400).json({ error: 'Lead price must be a valid non-negative number or empty' })
    }

    const [assignedEmployee, horse, instructor, parsedCheckIn, parsedCheckOut] = await Promise.all([
      prisma.employee.findUnique({
        where: { id: assignedEmployeeId },
        select: { id: true, fullName: true, designation: true },
      }),
      horseId
        ? prisma.horse.findUnique({
            where: { id: horseId },
            select: { id: true, name: true },
          })
        : Promise.resolve(null),
      instructorId
        ? prisma.employee.findUnique({
            where: { id: normalizedInstructorId! },
            select: { id: true, fullName: true, designation: true },
          })
        : Promise.resolve(null),
      Promise.resolve(safeDate(accommodationCheckIn)),
      Promise.resolve(safeDate(accommodationCheckOut)),
    ])

    if (!assignedEmployee) {
      return res.status(400).json({ error: 'Assigned employee not found' })
    }

    if (horseId && !horse) {
      return res.status(400).json({ error: 'Selected horse was not found' })
    }

    if (isRideBookingTask) {
      if (!horseId) {
        return res.status(400).json({ error: 'Horse is required for riding bookings' })
      }
      if (normalizedInstructorId && (!instructor || instructor.designation !== 'Instructor')) {
        return res.status(400).json({ error: 'Selected instructor is invalid' })
      }
      if (assignedEmployee.designation !== 'Jamedar') {
        return res.status(400).json({ error: 'Riding bookings must be assigned to a Jamedar' })
      }
      if (!isValidBookingCategory(bookingCategory)) {
        return res.status(400).json({ error: 'Invalid booking category' })
      }
      if (!isValidBookingSlot(bookingSlot)) {
        return res.status(400).json({ error: 'Invalid booking slot' })
      }

      const resolvedRideType = resolveBookingRideType(bookingCategory, bookingRideType)
      if (!resolvedRideType) {
        return res.status(400).json({ error: 'Invalid ride type for the selected booking category' })
      }

      const slotTime = getBookingSlotTime(bookingSlot)
      if (!slotTime) {
        return res.status(400).json({ error: 'Invalid booking slot time' })
      }

      if (bookingCategory === 'Fun Rides' && !isValidBookingDestination(bookingDestination)) {
        return res.status(400).json({ error: 'Fun rides require a valid inside/outside destination' })
      }

      const conflictingBooking = await prisma.task.findFirst({
        where: {
          type,
          horseId,
          scheduledTime: parsedScheduled,
          status: {
            not: 'Cancelled',
          },
        },
        select: {
          id: true,
          name: true,
          scheduledTime: true,
        },
      })

      if (conflictingBooking) {
        return res.status(400).json({
          error: `This horse is already booked at ${parsedScheduled.toLocaleString('en-IN')}. Please choose another horse or time.`,
        })
      }
    }

    const membershipEnabled =
      isMembershipBooking === true || isMembershipBooking === 'true'

    if (isRideBookingTask && membershipEnabled) {
      const rideCount = Number(packageRideCount)
      const memberCount = Number(packageMemberCount)
      const totalPrice = Number(packagePrice)
      const gstValue = Number(gstAmount)

      if (!isValidString(packageName, 1, 200)) {
        return res.status(400).json({ error: 'Package name is required for membership bookings' })
      }
      if (!Number.isFinite(rideCount) || rideCount < 1) {
        return res.status(400).json({ error: 'Package ride count must be at least 1' })
      }
      if (!Number.isFinite(memberCount) || memberCount < 1) {
        return res.status(400).json({ error: 'Member count must be at least 1' })
      }
      if (!Number.isFinite(totalPrice) || totalPrice < 0) {
        return res.status(400).json({ error: 'Package price must be a valid number' })
      }
      if (!Number.isFinite(gstValue) || gstValue < 0) {
        return res.status(400).json({ error: 'GST amount must be a valid number' })
      }
    }

    if (isAccommodationBookingTask) {
      if (assignedEmployee.designation !== 'Housekeeping') {
        return res.status(400).json({ error: 'Accommodation bookings must be assigned to Housekeeping' })
      }
      if (!parsedCheckIn || !parsedCheckOut) {
        return res.status(400).json({ error: 'Valid check-in and check-out timestamps are required' })
      }
      if (parsedCheckOut <= parsedCheckIn) {
        return res.status(400).json({ error: 'Check-out must be after check-in' })
      }
    }

    const resolvedBookingRideType = isRideBookingTask
      ? resolveBookingRideType(bookingCategory, bookingRideType)
      : null
    const sanitizedName = isRideBookingTask
      ? buildBookingTaskName({
          bookingRideType: resolvedBookingRideType!,
          horseName: horse!.name,
          bookingSlot,
          bookingDestination:
            bookingCategory === 'Fun Rides' ? bookingDestination : null,
        })
      : isAccommodationBookingTask
        ? buildAccommodationTaskName({
            customerName: sanitize(customerName),
            checkIn: parsedCheckIn!,
          })
      : sanitize(name)

    const task = await prisma.task.create({
      data: {
        name: sanitizedName,
        type: sanitize(type),
        horseId: horseId && horseId.trim() ? horseId : null, // Convert empty string to null
        instructorId: isRideBookingTask ? normalizedInstructorId : null,
        assignedEmployeeId,
        createdById: userId,
        scheduledTime: parsedScheduled,
        priority: priority || 'Medium',
        requiredProof: isAnyBookingTask ? false : requiredProof === true || requiredProof === 'true',
        customerName: isAnyBookingTask ? sanitize(customerName) : null,
        customerPhone: isAnyBookingTask ? sanitize(customerPhone) : null,
        paymentSource: isAnyBookingTask ? paymentSource : null,
        leadGroomName:
          isRideBookingTask && leadGroomName
            ? sanitize(leadGroomName)
            : null,
        leadPrice: isAnyBookingTask ? parsedLeadPrice : null,
        totalRoomPrice: isAnyBookingTask && totalRoomPrice !== undefined && totalRoomPrice !== null && totalRoomPrice !== ''
          ? Number(totalRoomPrice)
          : null,
        isPaid: isAnyBookingTask ? (isPaid === true || isPaid === 'true') : false,
        isMembershipBooking: isRideBookingTask ? membershipEnabled : false,
        packageName: isRideBookingTask && membershipEnabled ? sanitize(packageName) : null,
        packageRideCount: isRideBookingTask && membershipEnabled ? Number(packageRideCount) : null,
        packageMemberCount: isRideBookingTask && membershipEnabled ? Number(packageMemberCount) : null,
        packagePrice: isRideBookingTask && membershipEnabled ? Number(packagePrice) : null,
        gstAmount: isRideBookingTask && membershipEnabled ? Number(gstAmount) : null,
        bookingCategory: isRideBookingTask ? bookingCategory : null,
        bookingRideType: isRideBookingTask ? resolvedBookingRideType : null,
        bookingDestination:
          isRideBookingTask && bookingCategory === 'Fun Rides'
            ? bookingDestination
            : null,
        bookingSlot: isRideBookingTask ? bookingSlot : null,
        accommodationCheckIn: isAccommodationBookingTask ? parsedCheckIn : null,
        accommodationCheckOut: isAccommodationBookingTask ? parsedCheckOut : null,
        description: description ? sanitize(description) : undefined,
        status: 'Pending',
      },
      select: taskListSelect,
    })

    await invalidateTaskCaches(task.id)

    // Create notification for the assigned employee
    try {
      const scheduledStr = isRideBookingTask
        ? buildBookingNotificationMessage({
            action: 'created',
            horseName: horse!.name,
            instructorName: instructor?.fullName || null,
            bookingCategory,
            bookingRideType: resolvedBookingRideType!,
            bookingDestination:
              bookingCategory === 'Fun Rides' ? bookingDestination : null,
            bookingSlot,
            scheduledDate: parsedScheduled,
          })
        : isAccommodationBookingTask
          ? buildAccommodationNotificationMessage({
              action: 'created',
              customerName: sanitize(customerName),
              customerPhone: sanitize(customerPhone),
              paymentSource,
              checkIn: parsedCheckIn!,
              checkOut: parsedCheckOut!,
            })
        : `You have been assigned a new task scheduled for ${parsedScheduled.toLocaleString('en-IN', {
            day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
          })}. Priority: ${priority || 'Medium'}.`
      await createNotificationAndPublish({
        employeeId: assignedEmployeeId,
        type: 'task_assignment',
        title: isRideBookingTask
          ? `New riding booking: ${sanitizedName}`
          : isAccommodationBookingTask
            ? `New accommodation booking: ${sanitizedName}`
            : `New task assigned: ${sanitizedName}`,
        message: scheduledStr,
        relatedTaskId: task.id,
      })
    } catch (notifErr) {
      // Non-fatal: task was created, just log the notification failure
      console.error('Failed to create task assignment notification:', notifErr)
    }

    return res.status(201).json(task)
  } catch (error) {
    console.error('Error creating task:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
