const express = require('express');
const router = express.Router();
const { prisma } = require('../lib/prisma');
const { authenticateToken, authorize } = require('../middleware/auth');

// GET /api/horses - Get all horses
router.get('/', authenticateToken, async (req, res) => {
  try {
    const horses = await prisma.horse.findMany({
      orderBy: { name: 'asc' },
    });

    res.json({ data: horses });
  } catch (error) {
    console.error('Error fetching horses:', error);
    res.status(500).json({ error: 'Failed to fetch horses' });
  }
});

// GET /api/horses/:id - Get horse by ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const horse = await prisma.horse.findUnique({
      where: { id: req.params.id },
    });

    if (!horse) {
      return res.status(404).json({ error: 'Horse not found' });
    }

    res.json(horse);
  } catch (error) {
    console.error('Error fetching horse:', error);
    res.status(500).json({ error: 'Failed to fetch horse' });
  }
});

// POST /api/horses - Create new horse
router.post('/', authenticateToken, authorize('Admin', 'Instructor'), async (req, res) => {
  try {
    const horse = await prisma.horse.create({
      data: req.body,
    });

    res.json(horse);
  } catch (error) {
    console.error('Error creating horse:', error);
    res.status(500).json({ error: 'Failed to create horse' });
  }
});

// PUT /api/horses/:id - Update horse
router.put('/:id', authenticateToken, authorize('Admin', 'Instructor'), async (req, res) => {
  try {
    const horse = await prisma.horse.update({
      where: { id: req.params.id },
      data: req.body,
    });

    res.json(horse);
  } catch (error) {
    console.error('Error updating horse:', error);
    res.status(500).json({ error: 'Failed to update horse' });
  }
});

// DELETE /api/horses/:id - Delete horse
router.delete('/:id', authenticateToken, authorize('Admin'), async (req, res) => {
  try {
    const horse = await prisma.horse.delete({
      where: { id: req.params.id },
    });

    res.json({ message: 'Horse deleted', data: horse });
  } catch (error) {
    console.error('Error deleting horse:', error);
    res.status(500).json({ error: 'Failed to delete horse' });
  }
});

// GET /api/horses/:id/health-records - Get horse health records
router.get('/:id/health-records', authenticateToken, (req, res) => {
  res.json({ message: 'Get horse health records' });
});

// GET /api/horses/:id/tasks - Get horse tasks
router.get('/:id/tasks', authenticateToken, (req, res) => {
  res.json({ message: 'Get horse tasks' });
});

module.exports = router;
