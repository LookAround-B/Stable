const express = require('express');
const router = express.Router();
const { prisma } = require('../lib/prisma');
const { authenticateToken, authorize } = require('../middleware/auth');

// GET /api/audit-logs - Get audit logs
router.get('/', authenticateToken, authorize('Super Admin', 'Admin', 'Director'), async (req, res) => {
  try {
    const auditLogs = await prisma.auditLog.findMany({
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    res.json({ data: auditLogs });
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    res.status(500).json({ error: 'Failed to fetch audit logs' });
  }
});

// GET /api/audit-logs/:id - Get audit log by ID
router.get('/:id', authenticateToken, authorize('Super Admin', 'Admin', 'Director'), async (req, res) => {
  try {
    const auditLog = await prisma.auditLog.findUnique({
      where: { id: req.params.id },
      include: {
        user: true,
      },
    });

    if (!auditLog) {
      return res.status(404).json({ error: 'Audit log not found' });
    }

    res.json(auditLog);
  } catch (error) {
    console.error('Error fetching audit log:', error);
    res.status(500).json({ error: 'Failed to fetch audit log' });
  }
});

// GET /api/audit-logs/entity/:entityType/:entityId - Get logs for specific entity
router.get('/entity/:entityType/:entityId', authenticateToken, authorize('Super Admin', 'Admin'), async (req, res) => {
  try {
    const { entityType, entityId } = req.params;

    const auditLogs = await prisma.auditLog.findMany({
      where: {
        entityType,
        entityId,
      },
      include: {
        user: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ data: auditLogs });
  } catch (error) {
    console.error('Error fetching entity audit logs:', error);
    res.status(500).json({ error: 'Failed to fetch audit logs' });
  }
});

module.exports = router;
