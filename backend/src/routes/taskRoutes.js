const express = require('express');
const router = express.Router();
const { prisma } = require('../lib/prisma');
const { authenticateToken, authorize } = require('../middleware/auth');

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
router.post('/', authenticateToken, authorize('Admin', 'Instructor', 'Super Admin'), async (req, res) => {
  try {
    const { name, title, description, horseId, assignedEmployeeId, scheduledTime, priority, requiredProof, type } = req.body;
    const taskName = name || title; // frontend sends 'name', legacy may send 'title'

    if (!taskName || !assignedEmployeeId || !scheduledTime) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const task = await prisma.task.create({
      data: {
        name: taskName,
        description: description || '',
        horseId: horseId || null,
        assignedEmployeeId,
        createdById: req.user.id,
        scheduledTime: new Date(scheduledTime),
        priority: priority || 'Medium',
        type: type || 'Daily',
        requiredProof: requiredProof === true || requiredProof === 'true',
        status: 'Pending',
      },
      include: {
        assignedEmployee: true,
        horse: true,
        createdBy: true,
      },
    });

    // Notify the assigned employee
    try {
      const scheduledStr = new Date(scheduledTime).toLocaleString('en-IN', {
        day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
      });
      await prisma.notification.create({
        data: {
          employeeId: assignedEmployeeId,
          type: 'task_assignment',
          title: `New task assigned: ${taskName}`,
          message: `You have been assigned a new task scheduled for ${scheduledStr}. Priority: ${priority || 'Medium'}.`,
          relatedTaskId: task.id,
        },
      });
    } catch (notifErr) {
      console.error('Failed to create task assignment notification:', notifErr);
    }

    res.status(201).json(task);
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

module.exports = router;
