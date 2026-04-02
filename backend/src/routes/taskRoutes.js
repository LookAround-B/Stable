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
    const { title, description, horseId, assignedEmployeeId, scheduledTime, priority } = req.body;

    if (!assignedEmployeeId || !scheduledTime) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const task = await prisma.task.create({
      data: {
        name: title,
        description: description || '',
        horseId: horseId || null,
        assignedEmployeeId,
        createdById: req.user.id,
        scheduledTime: new Date(scheduledTime),
        priority: priority || 'Medium',
        type: 'Daily',
      },
      include: {
        assignedEmployee: true,
        horse: true,
        createdBy: true,
      },
    });

    res.json(task);
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

    res.json(task);
  } catch (error) {
    console.error('Error updating task:', error);
    res.status(500).json({ error: 'Failed to update task', details: error.message });
  }
});

module.exports = router;
