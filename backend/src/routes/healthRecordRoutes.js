const express = require('express');
const router = express.Router();
const { authenticateToken, authorize } = require('../middleware/auth');

// GET /api/health-records - Get health records
router.get('/', authenticateToken, (req, res) => {
  res.json({ message: 'Get health records' });
});

// GET /api/health-records/:id - Get health record by ID
router.get('/:id', authenticateToken, (req, res) => {
  res.json({ message: 'Get health record by ID' });
});

// POST /api/health-records - Create new health record
router.post('/', authenticateToken, authorize('Health Advisor', 'Admin'), (req, res) => {
  res.json({ message: 'Create new health record' });
});

// PUT /api/health-records/:id - Update health record
router.put('/:id', authenticateToken, authorize('Health Advisor', 'Admin'), (req, res) => {
  res.json({ message: 'Update health record' });
});

// DELETE /api/health-records/:id - Delete health record
router.delete('/:id', authenticateToken, authorize('Admin'), (req, res) => {
  res.json({ message: 'Delete health record' });
});

module.exports = router;
