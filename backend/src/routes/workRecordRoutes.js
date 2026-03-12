const express = require('express');
const { prisma } = require('../lib/prisma');
const router = express.Router();

// Get work records
router.get('/', async (req, res) => {
  try {
    const { staffId, date, category, startDate, endDate } = req.query;
    const where = {};

    if (staffId) {
      where.staffId = staffId;
    }

    if (category) {
      where.category = category;
    }

    if (date) {
      const dateObj = new Date(date);
      where.date = {
        gte: new Date(dateObj.getFullYear(), dateObj.getMonth(), dateObj.getDate()),
        lt: new Date(dateObj.getFullYear(), dateObj.getMonth(), dateObj.getDate() + 1),
      };
    }

    if (startDate || endDate) {
      where.date = where.date || {};
      if (startDate) {
        where.date.gte = new Date(startDate);
      }
      if (endDate) {
        where.date.lt = new Date(new Date(endDate).getTime() + 86400000);
      }
    }

    const workRecords = await prisma.workRecord.findMany({
      where,
      include: {
        staff: {
          select: {
            id: true,
            fullName: true,
            designation: true,
          },
        },
        entries: true,
      },
      orderBy: { date: 'desc' },
    });

    res.status(200).json({
      data: workRecords,
      message: 'Work records retrieved',
    });
  } catch (error) {
    console.error('Error fetching work records:', error);
    res.status(500).json({ message: 'Failed to fetch work records', error: error.message });
  }
});

// Create work record
router.post('/', async (req, res) => {
  try {
    const { staffId, date, category, entries, remarks } = req.body;

    if (!staffId || !date || !category || !Array.isArray(entries)) {
      return res.status(400).json({ 
        message: 'Missing required fields: staffId, date, category, entries' 
      });
    }

    const recordDate = new Date(date);
    recordDate.setHours(0, 0, 0, 0);

    // Calculate totals
    let totalAM = 0;
    let totalPM = 0;
    let totalWholeDayHours = 0;

    entries.forEach((entry) => {
      totalAM += entry.amHours || 0;
      totalPM += entry.pmHours || 0;
      totalWholeDayHours += entry.wholeDayHours || 0;
    });

    // Create work record with entries
    const workRecord = await prisma.workRecord.create({
      data: {
        staffId,
        date: recordDate,
        category,
        totalAM,
        totalPM,
        wholeDayHours: totalWholeDayHours,
        remarks,
        entries: {
          create: entries.map((entry) => ({
            taskDescription: entry.taskDescription,
            amHours: entry.amHours || 0,
            pmHours: entry.pmHours || 0,
            wholeDayHours: entry.wholeDayHours || 0,
            remarks: entry.remarks,
          })),
        },
      },
      include: {
        staff: {
          select: {
            id: true,
            fullName: true,
            designation: true,
          },
        },
        entries: true,
      },
    });

    res.status(201).json({
      message: 'Work record created',
      data: workRecord,
    });
  } catch (error) {
    console.error('Error creating work record:', error);
    res.status(500).json({ message: 'Failed to create work record', error: error.message });
  }
});

module.exports = router;
