const express = require('express');
const router = express.Router();
const { authenticateToken, authorize } = require('../middleware/auth');
const {
  getMedicineLogs,
  getMedicineLogById,
  createMedicineLog,
  updateMedicineLog,
  deleteMedicineLog,
  approveMedicineLog,
  rejectMedicineLog,
  getPendingMedicineLogs,
  getMyMedicineLogs,
} = require('../controllers/medicineLogController');

// GET /api/medicine-logs/my-logs - Get logged-in user's medicine logs (must come before /:id)
router.get('/my-logs', authenticateToken, getMyMedicineLogs);

// GET /api/medicine-logs/pending - Get pending medicine logs (for approval) (must come before /:id)
router.get('/pending', authenticateToken, authorize('Stable Manager', 'Director', 'Super Admin', 'School Administrator'), getPendingMedicineLogs);

// GET /api/medicine-logs - Get all medicine logs
router.get('/', authenticateToken, getMedicineLogs);

// GET /api/medicine-logs/:id - Get single medicine log
router.get('/:id', authenticateToken, getMedicineLogById);

// POST /api/medicine-logs - Create new medicine log (Jamedar only)
router.post('/', authenticateToken, authorize('Jamedar'), createMedicineLog);

// PUT /api/medicine-logs/:id - Update medicine log (only if pending)
router.put('/:id', authenticateToken, authorize('Jamedar'), updateMedicineLog);

// DELETE /api/medicine-logs/:id - Delete medicine log (only if pending)
router.delete('/:id', authenticateToken, authorize('Jamedar'), deleteMedicineLog);

// POST /api/medicine-logs/:id/approve - Approve medicine log
router.post(
  '/:id/approve',
  authenticateToken,
  authorize('Stable Manager', 'Director', 'Super Admin', 'School Administrator'),
  approveMedicineLog
);

// POST /api/medicine-logs/:id/reject - Reject medicine log
router.post(
  '/:id/reject',
  authenticateToken,
  authorize('Stable Manager', 'Director', 'Super Admin', 'School Administrator'),
  rejectMedicineLog
);

module.exports = router;
