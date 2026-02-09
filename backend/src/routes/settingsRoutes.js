const express = require('express');
const router = express.Router();
const { authenticateToken, authorize } = require('../middleware/auth');

// GET /api/settings - Get all settings (Admin only)
router.get('/', authenticateToken, authorize('Admin'), (req, res) => {
  res.json({ message: 'Get all settings' });
});

// GET /api/settings/:key - Get specific setting
router.get('/:key', authenticateToken, authorize('Admin'), (req, res) => {
  res.json({ message: 'Get specific setting' });
});

// PUT /api/settings/:key - Update setting
router.put('/:key', authenticateToken, authorize('Admin'), (req, res) => {
  res.json({ message: 'Update setting' });
});

// POST /api/settings - Create new setting
router.post('/', authenticateToken, authorize('Admin'), (req, res) => {
  res.json({ message: 'Create new setting' });
});

module.exports = router;
