const express = require('express');
const router = express.Router();
const { authenticateToken, authorize } = require('../middleware/auth');
const {
  getInventory,
  getInventoryById,
  createInventory,
  updateInventory,
  deleteInventory,
  getReport,
} = require('../controllers/medicineInventoryController');

// GET /api/medicine-inventory - Get all medicine inventory records
router.get('/', authenticateToken, getInventory);

// GET /api/medicine-inventory/:id - Get single record
router.get('/:id', authenticateToken, getInventoryById);

// POST /api/medicine-inventory - Create new inventory entry
// Only Stable Manager, Jamedar, Super Admin, Director, School Administrator can create
router.post(
  '/',
  authenticateToken,
  authorize('Stable Manager', 'Jamedar', 'Super Admin', 'Director', 'School Administrator'),
  createInventory
);

// PUT /api/medicine-inventory - Update inventory entry
router.put(
  '/',
  authenticateToken,
  authorize('Stable Manager', 'Jamedar', 'Super Admin', 'Director', 'School Administrator'),
  updateInventory
);

// DELETE /api/medicine-inventory/:id - Delete inventory entry
router.delete(
  '/:id',
  authenticateToken,
  authorize('Stable Manager', 'Super Admin', 'Director', 'School Administrator'),
  deleteInventory
);

// GET /api/medicine-inventory/report - Get medicine summary report
router.get('/report', authenticateToken, getReport);

module.exports = router;
