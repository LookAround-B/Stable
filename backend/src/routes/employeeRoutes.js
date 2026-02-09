const express = require('express');
const router = express.Router();
const { authenticateToken, authorize } = require('../middleware/auth');

// GET /api/employees - Get all employees
router.get('/', authenticateToken, (req, res) => {
  res.json({ message: 'Get all employees' });
});

// GET /api/employees/:id - Get employee by ID
router.get('/:id', authenticateToken, (req, res) => {
  res.json({ message: 'Get employee by ID' });
});

// POST /api/employees - Create new employee (Admin only)
router.post('/', authenticateToken, authorize('Admin'), (req, res) => {
  res.json({ message: 'Create new employee' });
});

// PUT /api/employees/:id - Update employee
router.put('/:id', authenticateToken, authorize('Admin'), (req, res) => {
  res.json({ message: 'Update employee' });
});

// DELETE /api/employees/:id - Delete employee
router.delete('/:id', authenticateToken, authorize('Admin'), (req, res) => {
  res.json({ message: 'Delete employee' });
});

// POST /api/employees/:id/approve - Approve employee profile
router.post('/:id/approve', authenticateToken, authorize('Admin'), (req, res) => {
  res.json({ message: 'Approve employee profile' });
});

// GET /api/employees/:id/performance - Get employee performance metrics
router.get('/:id/performance', authenticateToken, (req, res) => {
  res.json({ message: 'Get employee performance metrics' });
});

module.exports = router;
