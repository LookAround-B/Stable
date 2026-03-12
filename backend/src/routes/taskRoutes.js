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

// POST /api/tasks/:id/start - Start task
router.post('/:id/start', authenticateToken, (req, res) => {
  res.json({ message: 'Start task' });
});

// POST /api/tasks/:id/complete - Mark task as complete
router.post('/:id/complete', authenticateToken, (req, res) => {
  res.json({ message: 'Complete task' });
});

// POST /api/tasks/:id/upload-proof - Upload proof images
router.post('/:id/upload-proof', authenticateToken, (req, res) => {
  res.json({ message: 'Upload task proof' });
});

// POST /api/tasks/:id/submit-questionnaire - Submit task questionnaire
router.post('/:id/submit-questionnaire', authenticateToken, (req, res) => {
  res.json({ message: 'Submit task questionnaire' });
});

module.exports = router;
