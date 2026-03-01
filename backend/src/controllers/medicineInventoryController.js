const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Get medicine inventory records with optional filters
exports.getInventory = async (req, res) => {
  try {
    const { month, year, medicineType } = req.query;

    const where = {};
    if (month) where.month = parseInt(month);
    if (year) where.year = parseInt(year);
    if (medicineType) where.medicineType = medicineType;

    const records = await prisma.medicineInventory.findMany({
      where,
      include: {
        recordedBy: {
          select: {
            id: true,
            fullName: true,
            designation: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ data: records });
  } catch (error) {
    console.error('Error fetching medicine inventory:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch inventory' });
  }
};

// Get single medicine inventory record
exports.getInventoryById = async (req, res) => {
  try {
    const { id } = req.params;

    const record = await prisma.medicineInventory.findUnique({
      where: { id },
      include: {
        recordedBy: {
          select: {
            id: true,
            fullName: true,
            designation: true,
          },
        },
      },
    });

    if (!record) {
      return res.status(404).json({ error: 'Record not found' });
    }

    res.json({ data: record });
  } catch (error) {
    console.error('Error fetching medicine inventory record:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch record' });
  }
};

// Create new medicine inventory entry
exports.createInventory = async (req, res) => {
  try {
    const { medicineType, month, year, unitsPurchased, openingStock, unit, notes } = req.body;
    const userId = req.user?.id;

    if (!medicineType || !month || !year || !userId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Check if entry already exists for this medicine/month/year
    const existing = await prisma.medicineInventory.findUnique({
      where: {
        medicineType_month_year: {
          medicineType,
          month: parseInt(month),
          year: parseInt(year),
        },
      },
    });

    if (existing) {
      return res.status(409).json({ error: 'Entry already exists for this medicine/month/year' });
    }

    const totalOpening = parseFloat(openingStock || 0);
    const totalPurchased = parseFloat(unitsPurchased || 0);
    const totalLeft = totalOpening + totalPurchased;

    const record = await prisma.medicineInventory.create({
      data: {
        medicineType,
        month: parseInt(month),
        year: parseInt(year),
        openingStock: totalOpening,
        unitsPurchased: totalPurchased,
        unitsLeft: totalLeft,
        unit: unit || 'ml',
        notes: notes || '',
        recordedById: userId,
      },
      include: {
        recordedBy: {
          select: {
            id: true,
            fullName: true,
            designation: true,
          },
        },
      },
    });

    res.status(201).json({ data: record, message: 'Inventory record created' });
  } catch (error) {
    console.error('Error creating medicine inventory:', error);
    res.status(500).json({ error: error.message || 'Failed to create inventory record' });
  }
};

// Update medicine inventory entry
exports.updateInventory = async (req, res) => {
  try {
    const { id, unitsPurchased, openingStock, unit, notes } = req.body;

    if (!id) {
      return res.status(400).json({ error: 'Record ID is required' });
    }

    const existing = await prisma.medicineInventory.findUnique({
      where: { id },
    });

    if (!existing) {
      return res.status(404).json({ error: 'Record not found' });
    }

    const totalOpening = parseFloat(openingStock ?? existing.openingStock);
    const totalPurchased = parseFloat(unitsPurchased ?? existing.unitsPurchased);
    const totalLeft = totalOpening + totalPurchased - (existing.totalUsed || 0);

    const record = await prisma.medicineInventory.update({
      where: { id },
      data: {
        openingStock: totalOpening,
        unitsPurchased: totalPurchased,
        unitsLeft: Math.max(0, totalLeft),
        unit: unit || existing.unit,
        notes: notes ?? existing.notes,
      },
      include: {
        recordedBy: {
          select: {
            id: true,
            fullName: true,
            designation: true,
          },
        },
      },
    });

    res.json({ data: record, message: 'Inventory record updated' });
  } catch (error) {
    console.error('Error updating medicine inventory:', error);
    res.status(500).json({ error: error.message || 'Failed to update inventory record' });
  }
};

// Delete medicine inventory entry
exports.deleteInventory = async (req, res) => {
  try {
    const { id } = req.params;

    const record = await prisma.medicineInventory.findUnique({
      where: { id },
    });

    if (!record) {
      return res.status(404).json({ error: 'Record not found' });
    }

    await prisma.medicineInventory.delete({
      where: { id },
    });

    res.json({ message: 'Inventory record deleted' });
  } catch (error) {
    console.error('Error deleting medicine inventory:', error);
    res.status(500).json({ error: error.message || 'Failed to delete inventory record' });
  }
};

// Get medicine summary report
exports.getReport = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const where = {};
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }

    const records = await prisma.medicineInventory.findMany({
      where,
      include: {
        recordedBy: {
          select: {
            id: true,
            fullName: true,
            designation: true,
          },
        },
      },
      orderBy: { medicineType: 'asc' },
    });

    // Group by medicine type
    const grouped = records.reduce((acc, record) => {
      const type = record.medicineType;
      if (!acc[type]) {
        acc[type] = {
          medicineType: type,
          totalOpening: 0,
          totalPurchased: 0,
          totalUsed: 0,
          totalRemaining: 0,
          unit: record.unit,
        };
      }
      acc[type].totalOpening += record.openingStock || 0;
      acc[type].totalPurchased += record.unitsPurchased || 0;
      acc[type].totalUsed += record.totalUsed || 0;
      acc[type].totalRemaining += record.unitsLeft || 0;
      return acc;
    }, {});

    res.json({ data: grouped });
  } catch (error) {
    console.error('Error generating medicine report:', error);
    res.status(500).json({ error: error.message || 'Failed to generate report' });
  }
};
