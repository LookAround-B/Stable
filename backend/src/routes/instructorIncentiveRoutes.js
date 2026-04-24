const express = require('express');
const router = express.Router();
const { prisma } = require('../lib/prisma');
const { authenticateToken, authorize } = require('../middleware/auth');

const MINIMUM_INCENTIVE_AMOUNT = 1400;

// GET /api/instructor-incentives - Get all incentives (filtered by role)
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { instructorId, status, startDate, endDate, month, year } = req.query;
    const isAdmin = ['Super Admin', 'Director', 'School Administrator', 'Stable Manager'].includes(req.user.designation);

    const where = {};

    // Non-admins can only see their own incentives
    if (!isAdmin) {
      where.instructorId = req.user.id;
    } else if (instructorId) {
      where.instructorId = instructorId;
    }

    if (status) {
      where.status = status;
    }

    if (startDate && endDate) {
      where.date = {
        gte: new Date(startDate),
        lte: new Date(endDate),
      };
    } else if (month && year) {
      const startOfMonth = new Date(parseInt(year), parseInt(month) - 1, 1);
      const endOfMonth = new Date(parseInt(year), parseInt(month), 0, 23, 59, 59);
      where.date = {
        gte: startOfMonth,
        lte: endOfMonth,
      };
    }

    const incentives = await prisma.instructorIncentive.findMany({
      where,
      include: {
        instructor: {
          select: { id: true, fullName: true, designation: true, profileImage: true },
        },
        approvedBy: {
          select: { id: true, fullName: true },
        },
        createdBy: {
          select: { id: true, fullName: true },
        },
      },
      orderBy: { date: 'desc' },
    });

    res.json({ data: incentives });
  } catch (error) {
    console.error('Error fetching instructor incentives:', error);
    res.status(500).json({ error: 'Failed to fetch incentives', details: error.message });
  }
});

// GET /api/instructor-incentives/summary - Get summary stats
router.get('/summary', authenticateToken, async (req, res) => {
  try {
    const { month, year } = req.query;
    const isAdmin = ['Super Admin', 'Director', 'School Administrator', 'Stable Manager'].includes(req.user.designation);

    const where = {};

    if (!isAdmin) {
      where.instructorId = req.user.id;
    }

    if (month && year) {
      const startOfMonth = new Date(parseInt(year), parseInt(month) - 1, 1);
      const endOfMonth = new Date(parseInt(year), parseInt(month), 0, 23, 59, 59);
      where.date = {
        gte: startOfMonth,
        lte: endOfMonth,
      };
    }

    const [totalPending, totalApproved, totalPaid, totalRejected] = await Promise.all([
      prisma.instructorIncentive.aggregate({
        where: { ...where, status: 'Pending' },
        _sum: { amount: true },
        _count: true,
      }),
      prisma.instructorIncentive.aggregate({
        where: { ...where, status: 'Approved' },
        _sum: { amount: true },
        _count: true,
      }),
      prisma.instructorIncentive.aggregate({
        where: { ...where, status: 'Paid' },
        _sum: { amount: true },
        _count: true,
      }),
      prisma.instructorIncentive.aggregate({
        where: { ...where, status: 'Rejected' },
        _sum: { amount: true },
        _count: true,
      }),
    ]);

    res.json({
      data: {
        pending: { amount: totalPending._sum.amount || 0, count: totalPending._count },
        approved: { amount: totalApproved._sum.amount || 0, count: totalApproved._count },
        paid: { amount: totalPaid._sum.amount || 0, count: totalPaid._count },
        rejected: { amount: totalRejected._sum.amount || 0, count: totalRejected._count },
      },
    });
  } catch (error) {
    console.error('Error fetching incentive summary:', error);
    res.status(500).json({ error: 'Failed to fetch summary', details: error.message });
  }
});

// POST /api/instructor-incentives - Create new incentive
router.post('/', authenticateToken, authorize('Admin', 'Super Admin', 'Director', 'School Administrator', 'Stable Manager'), async (req, res) => {
  try {
    const { instructorId, date, amount, paymentMode, description, bookingId, lessonCount, notes } = req.body;

    if (!instructorId || !date || !amount || !paymentMode) {
      return res.status(400).json({ error: 'Missing required fields: instructorId, date, amount, paymentMode' });
    }

    // Validate minimum amount
    if (parseFloat(amount) < MINIMUM_INCENTIVE_AMOUNT) {
      return res.status(400).json({
        error: `Incentive amount must be at least ₹${MINIMUM_INCENTIVE_AMOUNT}. Only lessons with ₹${MINIMUM_INCENTIVE_AMOUNT}+ are eligible for incentives.`
      });
    }

    // Verify instructor exists and is an instructor
    const instructor = await prisma.employee.findUnique({
      where: { id: instructorId },
      select: { id: true, designation: true },
    });

    if (!instructor) {
      return res.status(404).json({ error: 'Instructor not found' });
    }

    if (instructor.designation !== 'Instructor') {
      return res.status(400).json({ error: 'Selected employee is not an instructor' });
    }

    const incentive = await prisma.instructorIncentive.create({
      data: {
        instructorId,
        date: new Date(date),
        amount: parseFloat(amount),
        paymentMode,
        description: description || null,
        bookingId: bookingId || null,
        lessonCount: parseInt(lessonCount) || 0,
        notes: notes || null,
        createdById: req.user.id,
        status: 'Pending',
      },
      include: {
        instructor: {
          select: { id: true, fullName: true, designation: true },
        },
        createdBy: {
          select: { id: true, fullName: true },
        },
      },
    });

    res.status(201).json({ data: incentive, message: 'Incentive created successfully' });
  } catch (error) {
    console.error('Error creating instructor incentive:', error);
    res.status(500).json({ error: 'Failed to create incentive', details: error.message });
  }
});

// PATCH /api/instructor-incentives/:id - Update incentive
router.patch('/:id', authenticateToken, authorize('Admin', 'Super Admin', 'Director', 'School Administrator', 'Stable Manager'), async (req, res) => {
  try {
    const { id } = req.params;
    const { amount, paymentMode, description, lessonCount, notes, status } = req.body;

    const existing = await prisma.instructorIncentive.findUnique({
      where: { id },
    });

    if (!existing) {
      return res.status(404).json({ error: 'Incentive not found' });
    }

    // Validate minimum amount if amount is being updated
    if (amount !== undefined && parseFloat(amount) < MINIMUM_INCENTIVE_AMOUNT) {
      return res.status(400).json({
        error: `Incentive amount must be at least ₹${MINIMUM_INCENTIVE_AMOUNT}`
      });
    }

    const updateData = {};
    if (amount !== undefined) updateData.amount = parseFloat(amount);
    if (paymentMode !== undefined) updateData.paymentMode = paymentMode;
    if (description !== undefined) updateData.description = description;
    if (lessonCount !== undefined) updateData.lessonCount = parseInt(lessonCount);
    if (notes !== undefined) updateData.notes = notes;

    // Handle status changes
    if (status !== undefined) {
      updateData.status = status;
      if (status === 'Approved' || status === 'Rejected') {
        updateData.approvedById = req.user.id;
      }
      if (status === 'Paid') {
        updateData.paidAt = new Date();
      }
    }

    const incentive = await prisma.instructorIncentive.update({
      where: { id },
      data: updateData,
      include: {
        instructor: {
          select: { id: true, fullName: true, designation: true },
        },
        approvedBy: {
          select: { id: true, fullName: true },
        },
        createdBy: {
          select: { id: true, fullName: true },
        },
      },
    });

    res.json({ data: incentive, message: 'Incentive updated successfully' });
  } catch (error) {
    console.error('Error updating instructor incentive:', error);
    res.status(500).json({ error: 'Failed to update incentive', details: error.message });
  }
});

// DELETE /api/instructor-incentives/:id - Delete incentive
router.delete('/:id', authenticateToken, authorize('Admin', 'Super Admin', 'Director', 'School Administrator'), async (req, res) => {
  try {
    const { id } = req.params;

    const existing = await prisma.instructorIncentive.findUnique({
      where: { id },
    });

    if (!existing) {
      return res.status(404).json({ error: 'Incentive not found' });
    }

    // Don't allow deleting paid incentives
    if (existing.status === 'Paid') {
      return res.status(400).json({ error: 'Cannot delete a paid incentive' });
    }

    await prisma.instructorIncentive.delete({
      where: { id },
    });

    res.json({ message: 'Incentive deleted successfully' });
  } catch (error) {
    console.error('Error deleting instructor incentive:', error);
    res.status(500).json({ error: 'Failed to delete incentive', details: error.message });
  }
});

module.exports = router;
