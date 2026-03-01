const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Get medicine logs with optional filters
exports.getMedicineLogs = async (req, res) => {
  try {
    const { approvalStatus, horseId, jamedarId, fromDate, toDate } = req.query;
    const userId = req.user?.id;
    const userDesignation = req.user?.designation;

    const where = {};

    if (approvalStatus) where.approvalStatus = approvalStatus;
    if (horseId) where.horseId = horseId;
    if (jamedarId) where.jamiedarId = jamedarId;

    if (fromDate || toDate) {
      where.timeAdministered = {};
      if (fromDate) where.timeAdministered.gte = new Date(fromDate);
      if (toDate) where.timeAdministered.lte = new Date(toDate);
    }

    // If user is Jamedar, show only their logs
    if (userDesignation === 'Jamedar') {
      where.jamiedarId = userId;
    }

    const logs = await prisma.medicineLog.findMany({
      where,
      include: {
        jamedar: {
          select: {
            id: true,
            fullName: true,
            designation: true,
          },
        },
        horse: {
          select: {
            id: true,
            name: true,
          },
        },
        approvedBy: {
          select: {
            id: true,
            fullName: true,
            designation: true,
          },
        },
      },
      orderBy: { timeAdministered: 'desc' },
    });

    res.json({ data: logs });
  } catch (error) {
    console.error('Error fetching medicine logs:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch logs' });
  }
};

// Get single medicine log
exports.getMedicineLogById = async (req, res) => {
  try {
    const { id } = req.params;

    const log = await prisma.medicineLog.findUnique({
      where: { id },
      include: {
        jamedar: {
          select: {
            id: true,
            fullName: true,
            designation: true,
          },
        },
        horse: {
          select: {
            id: true,
            name: true,
          },
        },
        approvedBy: {
          select: {
            id: true,
            fullName: true,
            designation: true,
          },
        },
      },
    });

    if (!log) {
      return res.status(404).json({ error: 'Medicine log not found' });
    }

    res.json({ data: log });
  } catch (error) {
    console.error('Error fetching medicine log:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch log' });
  }
};

// Create medicine log (Jamedar)
exports.createMedicineLog = async (req, res) => {
  try {
    const { horseId, medicineName, quantity, unit, timeAdministered, notes, photoUrl } = req.body;
    const userId = req.user?.id;

    if (!horseId || !medicineName || !quantity || !timeAdministered) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const log = await prisma.medicineLog.create({
      data: {
        jamiedarId: userId,
        horseId,
        medicineName,
        quantity: parseFloat(quantity),
        unit: unit || 'ml',
        timeAdministered: new Date(timeAdministered),
        notes: notes || '',
        photoUrl: photoUrl || '',
        approvalStatus: 'pending',
      },
      include: {
        jamedar: {
          select: {
            id: true,
            fullName: true,
            designation: true,
          },
        },
        horse: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    res.status(201).json({ data: log, message: 'Medicine log created successfully' });
  } catch (error) {
    console.error('Error creating medicine log:', error);
    res.status(500).json({ error: error.message || 'Failed to create medicine log' });
  }
};

// Update medicine log (only if pending)
exports.updateMedicineLog = async (req, res) => {
  try {
    const { id } = req.params;
    const { horseId, medicineName, quantity, unit, timeAdministered, notes, photoUrl } = req.body;

    const existing = await prisma.medicineLog.findUnique({
      where: { id },
    });

    if (!existing) {
      return res.status(404).json({ error: 'Medicine log not found' });
    }

    if (existing.approvalStatus !== 'pending') {
      return res.status(403).json({ error: 'Cannot edit approved or rejected records' });
    }

    const log = await prisma.medicineLog.update({
      where: { id },
      data: {
        horseId: horseId || existing.horseId,
        medicineName: medicineName || existing.medicineName,
        quantity: quantity ? parseFloat(quantity) : existing.quantity,
        unit: unit || existing.unit,
        timeAdministered: timeAdministered ? new Date(timeAdministered) : existing.timeAdministered,
        notes: notes ?? existing.notes,
        photoUrl: photoUrl || existing.photoUrl,
      },
      include: {
        jamedar: {
          select: {
            id: true,
            fullName: true,
            designation: true,
          },
        },
        horse: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    res.json({ data: log, message: 'Medicine log updated' });
  } catch (error) {
    console.error('Error updating medicine log:', error);
    res.status(500).json({ error: error.message || 'Failed to update medicine log' });
  }
};

// Delete medicine log (only if pending)
exports.deleteMedicineLog = async (req, res) => {
  try {
    const { id } = req.params;

    const log = await prisma.medicineLog.findUnique({
      where: { id },
    });

    if (!log) {
      return res.status(404).json({ error: 'Medicine log not found' });
    }

    if (log.approvalStatus !== 'pending') {
      return res.status(403).json({ error: 'Cannot delete approved or rejected records' });
    }

    await prisma.medicineLog.delete({
      where: { id },
    });

    res.json({ message: 'Medicine log deleted' });
  } catch (error) {
    console.error('Error deleting medicine log:', error);
    res.status(500).json({ error: error.message || 'Failed to delete medicine log' });
  }
};

// Approve medicine log (Stable Manager)
exports.approveMedicineLog = async (req, res) => {
  try {
    const { id } = req.params;
    const { comments } = req.body;
    const userId = req.user?.id;

    const log = await prisma.medicineLog.findUnique({
      where: { id },
    });

    if (!log) {
      return res.status(404).json({ error: 'Medicine log not found' });
    }

    if (log.approvalStatus !== 'pending') {
      return res.status(400).json({ error: 'Only pending logs can be approved' });
    }

    const updated = await prisma.medicineLog.update({
      where: { id },
      data: {
        approvalStatus: 'approved',
        approvedById: userId,
        approvalDate: new Date(),
      },
      include: {
        jamedar: {
          select: {
            id: true,
            fullName: true,
            designation: true,
          },
        },
        horse: {
          select: {
            id: true,
            name: true,
          },
        },
        approvedBy: {
          select: {
            id: true,
            fullName: true,
            designation: true,
          },
        },
      },
    });

    res.json({ data: updated, message: 'Medicine log approved' });
  } catch (error) {
    console.error('Error approving medicine log:', error);
    res.status(500).json({ error: error.message || 'Failed to approve medicine log' });
  }
};

// Reject medicine log (Stable Manager)
exports.rejectMedicineLog = async (req, res) => {
  try {
    const { id } = req.params;
    const { rejectionReason } = req.body;

    if (!rejectionReason) {
      return res.status(400).json({ error: 'Rejection reason is required' });
    }

    const log = await prisma.medicineLog.findUnique({
      where: { id },
    });

    if (!log) {
      return res.status(404).json({ error: 'Medicine log not found' });
    }

    if (log.approvalStatus !== 'pending') {
      return res.status(400).json({ error: 'Only pending logs can be rejected' });
    }

    const updated = await prisma.medicineLog.update({
      where: { id },
      data: {
        approvalStatus: 'rejected',
        rejectionReason,
      },
      include: {
        jamedar: {
          select: {
            id: true,
            fullName: true,
            designation: true,
          },
        },
        horse: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    res.json({ data: updated, message: 'Medicine log rejected' });
  } catch (error) {
    console.error('Error rejecting medicine log:', error);
    res.status(500).json({ error: error.message || 'Failed to reject medicine log' });
  }
};

// Get pending medicine logs (for approval)
exports.getPendingMedicineLogs = async (req, res) => {
  try {
    const logs = await prisma.medicineLog.findMany({
      where: {
        approvalStatus: 'pending',
      },
      include: {
        jamedar: {
          select: {
            id: true,
            fullName: true,
            designation: true,
          },
        },
        horse: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: { timeAdministered: 'desc' },
    });

    res.json({ data: logs });
  } catch (error) {
    console.error('Error fetching pending medicine logs:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch pending logs' });
  }
};

// Get my medicine logs (for Jamedar)
exports.getMyMedicineLogs = async (req, res) => {
  try {
    const userId = req.user?.id;

    const logs = await prisma.medicineLog.findMany({
      where: {
        jamiedarId: userId,
      },
      include: {
        jamedar: {
          select: {
            id: true,
            fullName: true,
            designation: true,
          },
        },
        horse: {
          select: {
            id: true,
            name: true,
          },
        },
        approvedBy: {
          select: {
            id: true,
            fullName: true,
            designation: true,
          },
        },
      },
      orderBy: { timeAdministered: 'desc' },
    });

    res.json({ data: logs });
  } catch (error) {
    console.error('Error fetching my medicine logs:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch logs' });
  }
};
