const express = require('express');
const router = express.Router();
const { authenticateToken, authorize } = require('../middleware/auth');
const {
  getAllExpenses,
  getExpenseById,
  createExpense,
  updateExpense,
  deleteExpense,
} = require('../controllers/expenseController');

// GET /api/expenses - Get all expenses (with filtering)
router.get('/', authenticateToken, getAllExpenses);

// GET /api/expenses/:id - Get expense by ID
router.get('/:id', authenticateToken, getExpenseById);

// POST /api/expenses - Create new expense
// Only Senior Executive – Accounts and Junior Executive – Accounts can create expenses
router.post('/', authenticateToken, authorize('Senior Executive - Accounts', 'Junior Executive - Accounts'), createExpense);

// PUT /api/expenses/:id - Update expense
// Only Senior Executive – Accounts and Junior Executive – Accounts can edit expenses
router.put('/:id', authenticateToken, authorize('Senior Executive - Accounts', 'Junior Executive - Accounts'), updateExpense);

// DELETE /api/expenses/:id - Delete expense
// Only Senior Executive – Accounts and Junior Executive – Accounts can delete expenses
router.delete('/:id', authenticateToken, authorize('Senior Executive - Accounts', 'Junior Executive - Accounts'), deleteExpense);

module.exports = router;
