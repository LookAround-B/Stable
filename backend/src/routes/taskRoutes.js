const express = require('express');
const router = express.Router();
const { authenticateToken, authorize } = require('../middleware/auth');

// GET /api/tasks - Get tasks (filtered by role)
router.get('/', authenticateToken, (req, res) => {
  res.json({ message: 'Get tasks' });
});

// GET /api/tasks/:id - Get task by ID
router.get('/:id', authenticateToken, (req, res) => {
  res.json({ message: 'Get task by ID' });
});

// POST /api/tasks - Create new task
router.post('/', authenticateToken, authorize('Admin', 'Instructor'), (req, res) => {
  res.json({ message: 'Create new task' });
});

// PUT /api/tasks/:id - Update task
router.put('/:id', authenticateToken, (req, res) => {
  res.json({ message: 'Update task' });
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
