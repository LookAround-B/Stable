const express = require('express');
const router = express.Router();
const { prisma } = require('../lib/prisma');
const { authenticateToken, authorize } = require('../middleware/auth');

// Booking type constants
const BOOKING_TASK_TYPE = 'Work Record';
const ACCOMMODATION_TASK_TYPE = 'Accommodation Booking';

// Weekend booking capacity limits
const WEEKEND_BOOKING_LIMIT = 100;
const WEEKEND_BOOKING_WARNING = 50;

// Helper: Check if a date is a weekend (Saturday or Sunday)
const isWeekend = (date) => {
  const day = new Date(date).getDay();
  return day === 0 || day === 6; // Sunday = 0, Saturday = 6
};

// Helper: Check for horse collision (same horse, same slot, same date)
const checkHorseCollision = async (horseId, bookingSlot, scheduledTime, excludeTaskId = null) => {
  if (!horseId || !bookingSlot || !scheduledTime) return null;

  const scheduledDate = new Date(scheduledTime);
  const startOfDay = new Date(scheduledDate);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(scheduledDate);
  endOfDay.setHours(23, 59, 59, 999);

  const where = {
    horseId,
    bookingSlot,
    scheduledTime: { gte: startOfDay, lte: endOfDay },
    type: BOOKING_TASK_TYPE,
    status: { notIn: ['Cancelled', 'Rejected'] },
  };

  if (excludeTaskId) {
    where.id = { not: excludeTaskId };
  }

  const existingBooking = await prisma.task.findFirst({
    where,
    include: { horse: { select: { name: true } } },
  });

  return existingBooking;
};

// Helper: Check for instructor collision (same instructor, same slot, same date)
const checkInstructorCollision = async (instructorId, bookingSlot, scheduledTime, excludeTaskId = null) => {
  if (!instructorId || !bookingSlot || !scheduledTime) return null;

  const scheduledDate = new Date(scheduledTime);
  const startOfDay = new Date(scheduledDate);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(scheduledDate);
  endOfDay.setHours(23, 59, 59, 999);

  const where = {
    instructorId,
    bookingSlot,
    scheduledTime: { gte: startOfDay, lte: endOfDay },
    type: BOOKING_TASK_TYPE,
    status: { notIn: ['Cancelled', 'Rejected'] },
  };

  if (excludeTaskId) {
    where.id = { not: excludeTaskId };
  }

  const existingBooking = await prisma.task.findFirst({
    where,
    include: { instructor: { select: { fullName: true } } },
  });

  return existingBooking;
};

// Helper: Check weekend booking capacity
const checkWeekendCapacity = async (scheduledTime, excludeTaskId = null) => {
  const scheduledDate = new Date(scheduledTime);

  if (!isWeekend(scheduledDate)) {
    return { withinLimit: true, count: 0 };
  }

  const startOfDay = new Date(scheduledDate);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(scheduledDate);
  endOfDay.setHours(23, 59, 59, 999);

  const where = {
    scheduledTime: { gte: startOfDay, lte: endOfDay },
    type: BOOKING_TASK_TYPE,
    status: { notIn: ['Cancelled', 'Rejected'] },
  };

  if (excludeTaskId) {
    where.id = { not: excludeTaskId };
  }

  const count = await prisma.task.count({ where });

  return {
    withinLimit: count < WEEKEND_BOOKING_LIMIT,
    count,
    isWarning: count >= WEEKEND_BOOKING_WARNING,
    limit: WEEKEND_BOOKING_LIMIT,
    warning: WEEKEND_BOOKING_WARNING,
  };
};

// GET /api/tasks - Get tasks (filtered by role)
router.get('/', authenticateToken, async (req, res) => {
  try {
    const tasks = await prisma.task.findMany({
      include: {
        assignedEmployee: {
          select: { id: true, fullName: true, designation: true },
        },
        horse: {
          select: { id: true, name: true },
        },
        createdBy: {
          select: { id: true, fullName: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ data: tasks });
  } catch (error) {
    console.error('Error fetching tasks:', error);
    res.status(500).json({ error: 'Failed to fetch tasks', details: error.message });
  }
});

// GET /api/tasks/my-tasks - Get tasks assigned to current user
router.get('/my-tasks', authenticateToken, async (req, res) => {
  try {
    const tasks = await prisma.task.findMany({
      where: { assignedEmployeeId: req.user.id },
      include: {
        horse: true,
        assignedEmployee: true,
        createdBy: true,
      },
      orderBy: { scheduledTime: 'desc' },
      take: 1000,
    });
    res.json({ data: tasks });
  } catch (error) {
    console.error('Error fetching my tasks:', error);
    res.status(500).json({ error: 'Failed to fetch tasks', details: error.message });
  }
});

// PATCH /api/tasks/:id/start - Start a task (set to In Progress)
router.patch('/:id/start', authenticateToken, async (req, res) => {
  try {
    const task = await prisma.task.findUnique({ where: { id: req.params.id } });
    if (!task) return res.status(404).json({ error: 'Task not found' });
    if (task.assignedEmployeeId !== req.user.id)
      return res.status(403).json({ error: 'You are not assigned to this task' });
    if (task.status !== 'Pending')
      return res.status(400).json({ error: `Task cannot be started — current status is "${task.status}"` });

    const updated = await prisma.task.update({
      where: { id: req.params.id },
      data: { status: 'In Progress' },
      include: { horse: true, assignedEmployee: true, createdBy: true },
    });
    res.json({ success: true, data: updated, message: 'Task started successfully.' });
  } catch (error) {
    console.error('Error starting task:', error);
    res.status(500).json({ error: 'Failed to start task', details: error.message });
  }
});

// PATCH /api/tasks/:id/submit-completion - Submit task completion
router.patch('/:id/submit-completion', authenticateToken, async (req, res) => {
  try {
    const { proofImage, completionNotes } = req.body;
    const task = await prisma.task.findUnique({
      where: { id: req.params.id },
      include: { assignedEmployee: true, createdBy: true },
    });
    if (!task) return res.status(404).json({ error: 'Task not found' });
    if (task.assignedEmployeeId !== req.user.id)
      return res.status(403).json({ error: 'You are not assigned to this task' });
    if (task.status !== 'In Progress')
      return res.status(400).json({ error: 'Task must be in progress before submission' });
    if (task.requiredProof && !proofImage)
      return res.status(400).json({ error: 'Photo evidence is required for this task' });

    const updated = await prisma.task.update({
      where: { id: req.params.id },
      data: {
        status: 'Pending Review',
        proofImage: proofImage || undefined,
        completionNotes: completionNotes || undefined,
        submittedAt: new Date(),
        completedTime: new Date(),
      },
      include: { horse: true, assignedEmployee: true, createdBy: true },
    });

    // Notify the task creator that submission is pending review
    try {
      const employeeName = task.assignedEmployee?.fullName || 'An employee';
      console.log('[NOTIF] Creating completion notification for createdById:', task.createdById, 'task:', task.name);
      const notif = await prisma.notification.create({
        data: {
          employeeId: task.createdById,
          type: 'task_completion',
          title: `Task submitted for review: ${task.name}`,
          message: `${employeeName} has completed "${task.name}" and submitted it for your approval.`,
          relatedTaskId: task.id,
        },
      });
      console.log('[NOTIF] Created notification id:', notif.id);
    } catch (notifErr) {
      console.error('[NOTIF] Failed to create task completion notification:', notifErr);
    }

    res.json({ success: true, data: updated, message: 'Task submitted successfully. Awaiting approval.' });
  } catch (error) {
    console.error('Error submitting task:', error);
    res.status(500).json({ error: 'Failed to submit task', details: error.message });
  }
});

// GET /api/tasks/:id - Get task by ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const task = await prisma.task.findUnique({
      where: { id: req.params.id },
      include: {
        assignedEmployee: true,
        horse: true,
        createdBy: true,
      },
    });

    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    res.json(task);
  } catch (error) {
    console.error('Error fetching task:', error);
    res.status(500).json({ error: 'Failed to fetch task', details: error.message });
  }
});

// POST /api/tasks - Create new task
router.post('/', authenticateToken, authorize('Admin', 'Instructor', 'Super Admin', 'Director', 'School Administrator', 'Stable Manager', 'Jamedar'), async (req, res) => {
  try {
    const {
      name, title, description, horseId, assignedEmployeeId, scheduledTime, priority, requiredProof, type,
      // Booking-specific fields
      instructorId, customerName, customerPhone, paymentSource, leadGroomName, leadPrice,
      isMembershipBooking, packageName, packageRideCount, packageMemberCount, packagePrice, gstAmount,
      bookingCategory, bookingRideType, bookingDestination, bookingSlot,
      accommodationCheckIn, accommodationCheckOut,
    } = req.body;

    const taskName = name || title; // frontend sends 'name', legacy may send 'title'
    const isBookingTask = type === BOOKING_TASK_TYPE || type === ACCOMMODATION_TASK_TYPE;

    // Basic validation
    if (!isBookingTask && !taskName) {
      return res.status(400).json({ error: 'Task name is required' });
    }
    if (!assignedEmployeeId || !scheduledTime) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Booking-specific validations
    if (type === BOOKING_TASK_TYPE) {
      // Check horse collision
      if (horseId && bookingSlot) {
        const horseCollision = await checkHorseCollision(horseId, bookingSlot, scheduledTime);
        if (horseCollision) {
          return res.status(400).json({
            error: `Horse "${horseCollision.horse?.name || 'Unknown'}" is already booked for slot ${bookingSlot} on this date. Please choose a different horse or time slot.`,
            type: 'HORSE_COLLISION',
          });
        }
      }

      // Check instructor collision
      if (instructorId && bookingSlot) {
        const instructorCollision = await checkInstructorCollision(instructorId, bookingSlot, scheduledTime);
        if (instructorCollision) {
          return res.status(400).json({
            error: `Instructor "${instructorCollision.instructor?.fullName || 'Unknown'}" is already booked for slot ${bookingSlot} on this date. Please choose a different instructor or time slot.`,
            type: 'INSTRUCTOR_COLLISION',
          });
        }
      }

      // Check weekend capacity
      const capacity = await checkWeekendCapacity(scheduledTime);
      if (!capacity.withinLimit) {
        return res.status(400).json({
          error: `Weekend booking limit reached (${capacity.limit} bookings). Cannot create more bookings for this date.`,
          type: 'CAPACITY_LIMIT',
        });
      }
    }

    // Generate task name for bookings
    let generatedName = taskName;
    if (isBookingTask && !taskName) {
      if (type === BOOKING_TASK_TYPE) {
        generatedName = `Booking: ${customerName || 'Guest'} - Slot ${bookingSlot || 'N/A'}`;
      } else if (type === ACCOMMODATION_TASK_TYPE) {
        generatedName = `Accommodation: ${customerName || 'Guest'}`;
      }
    }

    const task = await prisma.task.create({
      data: {
        name: generatedName,
        description: description || '',
        horseId: horseId || null,
        assignedEmployeeId,
        createdById: req.user.id,
        scheduledTime: new Date(scheduledTime),
        priority: priority || 'Medium',
        type: type || 'Daily',
        requiredProof: requiredProof === true || requiredProof === 'true',
        status: 'Pending',
        // Booking-specific fields
        instructorId: instructorId || null,
        customerName: customerName || null,
        customerPhone: customerPhone || null,
        paymentSource: paymentSource || null,
        leadGroomName: leadGroomName || null,
        leadPrice: leadPrice ? parseFloat(leadPrice) : null,
        isMembershipBooking: Boolean(isMembershipBooking),
        packageName: packageName || null,
        packageRideCount: packageRideCount ? parseInt(packageRideCount) : null,
        packageMemberCount: packageMemberCount ? parseInt(packageMemberCount) : null,
        packagePrice: packagePrice ? parseFloat(packagePrice) : null,
        gstAmount: gstAmount !== '' && gstAmount !== undefined ? parseFloat(gstAmount) : null,
        bookingCategory: bookingCategory || null,
        bookingRideType: bookingRideType || null,
        bookingDestination: bookingDestination || null,
        bookingSlot: bookingSlot || null,
        accommodationCheckIn: accommodationCheckIn ? new Date(accommodationCheckIn) : null,
        accommodationCheckOut: accommodationCheckOut ? new Date(accommodationCheckOut) : null,
      },
      include: {
        assignedEmployee: true,
        horse: true,
        createdBy: true,
        instructor: { select: { id: true, fullName: true } },
      },
    });

    // Include capacity warning in response for weekends
    let capacityWarning = null;
    if (type === BOOKING_TASK_TYPE) {
      const capacity = await checkWeekendCapacity(scheduledTime);
      if (capacity.isWarning) {
        capacityWarning = `Weekend booking capacity: ${capacity.count + 1}/${capacity.limit}. Consider spreading bookings.`;
      }
    }

    // Notify the assigned employee
    try {
      const scheduledStr = new Date(scheduledTime).toLocaleString('en-IN', {
        day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
      });
      await prisma.notification.create({
        data: {
          employeeId: assignedEmployeeId,
          type: 'task_assignment',
          title: `New ${isBookingTask ? 'booking' : 'task'} assigned: ${generatedName}`,
          message: `You have been assigned a new ${isBookingTask ? 'booking' : 'task'} scheduled for ${scheduledStr}. Priority: ${priority || 'Medium'}.`,
          relatedTaskId: task.id,
        },
      });
    } catch (notifErr) {
      console.error('Failed to create task assignment notification:', notifErr);
    }

    res.status(201).json({ ...task, capacityWarning });
  } catch (error) {
    console.error('Error creating task:', error);
    res.status(500).json({ error: 'Failed to create task', details: error.message });
  }
});

// PUT /api/tasks/:id - Update task
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { status, ...updateData } = req.body;

    const task = await prisma.task.update({
      where: { id: req.params.id },
      data: {
        ...updateData,
        ...(status && { status }),
      },
      include: {
        assignedEmployee: true,
        horse: true,
        createdBy: true,
      },
    });

    // When task is Approved or Rejected — handle notifications
    if (status === 'Approved' || status === 'Rejected') {
      try {
        // 1. Auto-mark the task_completion notification as read for the reviewer
        await prisma.notification.updateMany({
          where: { relatedTaskId: req.params.id, type: 'task_completion', isRead: false },
          data: { isRead: true, readAt: new Date() },
        });

        // 2. Notify the assigned employee of the outcome
        const employeeMsg = status === 'Approved'
          ? `Your task "${task.name}" has been approved. Great work!`
          : `Your task "${task.name}" was rejected. Please check with your supervisor.`;
        await prisma.notification.create({
          data: {
            employeeId: task.assignedEmployeeId,
            type: status === 'Approved' ? 'approval_request' : 'general',
            title: `Task ${status}: ${task.name}`,
            message: employeeMsg,
            relatedTaskId: req.params.id,
          },
        });
      } catch (notifErr) {
        console.error('[NOTIF] Failed to handle approval notifications:', notifErr);
      }
    }

    res.json(task);
  } catch (error) {
    console.error('Error updating task:', error);
    res.status(500).json({ error: 'Failed to update task', details: error.message });
  }
});

// PATCH /api/tasks/:id - Update task (partial update with collision checking)
router.patch('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      status, horseId, instructorId, bookingSlot, scheduledTime, type,
      ...otherUpdateData
    } = req.body;

    // Get existing task
    const existingTask = await prisma.task.findUnique({
      where: { id },
      select: { type: true, horseId: true, instructorId: true, bookingSlot: true, scheduledTime: true },
    });

    if (!existingTask) {
      return res.status(404).json({ error: 'Task not found' });
    }

    const taskType = type || existingTask.type;
    const isBookingTask = taskType === BOOKING_TASK_TYPE;

    // Determine values to check for collisions
    const checkHorseId = horseId !== undefined ? horseId : existingTask.horseId;
    const checkInstructorId = instructorId !== undefined ? instructorId : existingTask.instructorId;
    const checkSlot = bookingSlot !== undefined ? bookingSlot : existingTask.bookingSlot;
    const checkTime = scheduledTime !== undefined ? scheduledTime : existingTask.scheduledTime;

    // Booking-specific collision validation
    if (isBookingTask && status !== 'Cancelled') {
      // Check horse collision if horse or slot changed
      if (checkHorseId && checkSlot && (horseId !== undefined || bookingSlot !== undefined || scheduledTime !== undefined)) {
        const horseCollision = await checkHorseCollision(checkHorseId, checkSlot, checkTime, id);
        if (horseCollision) {
          return res.status(400).json({
            error: `Horse "${horseCollision.horse?.name || 'Unknown'}" is already booked for slot ${checkSlot} on this date. Please choose a different horse or time slot.`,
            type: 'HORSE_COLLISION',
          });
        }
      }

      // Check instructor collision if instructor or slot changed
      if (checkInstructorId && checkSlot && (instructorId !== undefined || bookingSlot !== undefined || scheduledTime !== undefined)) {
        const instructorCollision = await checkInstructorCollision(checkInstructorId, checkSlot, checkTime, id);
        if (instructorCollision) {
          return res.status(400).json({
            error: `Instructor "${instructorCollision.instructor?.fullName || 'Unknown'}" is already booked for slot ${checkSlot} on this date. Please choose a different instructor or time slot.`,
            type: 'INSTRUCTOR_COLLISION',
          });
        }
      }

      // Check weekend capacity if date changed
      if (scheduledTime !== undefined) {
        const capacity = await checkWeekendCapacity(checkTime, id);
        if (!capacity.withinLimit) {
          return res.status(400).json({
            error: `Weekend booking limit reached (${capacity.limit} bookings). Cannot move booking to this date.`,
            type: 'CAPACITY_LIMIT',
          });
        }
      }
    }

    // Build update data
    const updateData = {
      ...otherUpdateData,
      ...(status !== undefined && { status }),
      ...(horseId !== undefined && { horseId: horseId || null }),
      ...(instructorId !== undefined && { instructorId: instructorId || null }),
      ...(bookingSlot !== undefined && { bookingSlot }),
      ...(scheduledTime !== undefined && { scheduledTime: new Date(scheduledTime) }),
      ...(type !== undefined && { type }),
    };

    // Parse numeric fields
    if (otherUpdateData.leadPrice !== undefined) {
      updateData.leadPrice = otherUpdateData.leadPrice ? parseFloat(otherUpdateData.leadPrice) : null;
    }
    if (otherUpdateData.packageRideCount !== undefined) {
      updateData.packageRideCount = otherUpdateData.packageRideCount ? parseInt(otherUpdateData.packageRideCount) : null;
    }
    if (otherUpdateData.packageMemberCount !== undefined) {
      updateData.packageMemberCount = otherUpdateData.packageMemberCount ? parseInt(otherUpdateData.packageMemberCount) : null;
    }
    if (otherUpdateData.packagePrice !== undefined) {
      updateData.packagePrice = otherUpdateData.packagePrice ? parseFloat(otherUpdateData.packagePrice) : null;
    }
    if (otherUpdateData.gstAmount !== undefined) {
      updateData.gstAmount = otherUpdateData.gstAmount !== '' ? parseFloat(otherUpdateData.gstAmount) : null;
    }
    if (otherUpdateData.accommodationCheckIn !== undefined) {
      updateData.accommodationCheckIn = otherUpdateData.accommodationCheckIn ? new Date(otherUpdateData.accommodationCheckIn) : null;
    }
    if (otherUpdateData.accommodationCheckOut !== undefined) {
      updateData.accommodationCheckOut = otherUpdateData.accommodationCheckOut ? new Date(otherUpdateData.accommodationCheckOut) : null;
    }

    const task = await prisma.task.update({
      where: { id },
      data: updateData,
      include: {
        assignedEmployee: true,
        horse: true,
        createdBy: true,
        instructor: { select: { id: true, fullName: true } },
      },
    });

    // Handle approval/rejection notifications
    if (status === 'Approved' || status === 'Rejected') {
      try {
        await prisma.notification.updateMany({
          where: { relatedTaskId: id, type: 'task_completion', isRead: false },
          data: { isRead: true, readAt: new Date() },
        });

        const employeeMsg = status === 'Approved'
          ? `Your task "${task.name}" has been approved. Great work!`
          : `Your task "${task.name}" was rejected. Please check with your supervisor.`;
        await prisma.notification.create({
          data: {
            employeeId: task.assignedEmployeeId,
            type: status === 'Approved' ? 'approval_request' : 'general',
            title: `Task ${status}: ${task.name}`,
            message: employeeMsg,
            relatedTaskId: id,
          },
        });
      } catch (notifErr) {
        console.error('[NOTIF] Failed to handle approval notifications:', notifErr);
      }
    }

    res.json(task);
  } catch (error) {
    console.error('Error updating task:', error);
    res.status(500).json({ error: 'Failed to update task', details: error.message });
  }
});

// GET /api/tasks/check-availability - Check horse/instructor availability for a slot
router.get('/check-availability', authenticateToken, async (req, res) => {
  try {
    const { date, slot, horseId, instructorId, excludeTaskId } = req.query;

    if (!date || !slot) {
      return res.status(400).json({ error: 'Date and slot are required' });
    }

    const results = {
      horseAvailable: true,
      instructorAvailable: true,
      horseConflict: null,
      instructorConflict: null,
      capacityInfo: null,
    };

    // Check horse availability
    if (horseId) {
      const collision = await checkHorseCollision(horseId, slot, date, excludeTaskId);
      if (collision) {
        results.horseAvailable = false;
        results.horseConflict = {
          horseName: collision.horse?.name,
          customerName: collision.customerName,
          taskId: collision.id,
        };
      }
    }

    // Check instructor availability
    if (instructorId) {
      const collision = await checkInstructorCollision(instructorId, slot, date, excludeTaskId);
      if (collision) {
        results.instructorAvailable = false;
        results.instructorConflict = {
          instructorName: collision.instructor?.fullName,
          customerName: collision.customerName,
          taskId: collision.id,
        };
      }
    }

    // Check capacity
    const capacity = await checkWeekendCapacity(date, excludeTaskId);
    results.capacityInfo = {
      isWeekend: isWeekend(date),
      currentCount: capacity.count,
      limit: capacity.limit,
      withinLimit: capacity.withinLimit,
      isWarning: capacity.isWarning,
    };

    res.json({ data: results });
  } catch (error) {
    console.error('Error checking availability:', error);
    res.status(500).json({ error: 'Failed to check availability', details: error.message });
  }
});

module.exports = router;
