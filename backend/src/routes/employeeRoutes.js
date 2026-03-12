const express = require('express');
const router = express.Router();
const { prisma } = require('../lib/prisma');
const { authenticateToken, authorize } = require('../middleware/auth');

// GET /api/employees - Get all employees
router.get('/', authenticateToken, async (req, res) => {
  try {
    const employees = await prisma.employee.findMany({
      select: {
        id: true,
        fullName: true,
        email: true,
        designation: true,
        phoneNumber: true,
        employmentStatus: true,
        profileImage: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ data: employees });
  } catch (error) {
    console.error('Error fetching employees:', error);
    res.status(500).json({ error: 'Failed to fetch employees' });
  }
});

// GET /api/employees/:id - Get employee by ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const employee = await prisma.employee.findUnique({
      where: { id: req.params.id },
      select: {
        id: true,
        fullName: true,
        email: true,
        designation: true,
        phoneNumber: true,
        employmentStatus: true,
        profileImage: true,
      },
    });

    if (!employee) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    res.json(employee);
  } catch (error) {
    console.error('Error fetching employee:', error);
    res.status(500).json({ error: 'Failed to fetch employee' });
  }
});

// POST /api/employees - Create new employee (Admin only)
router.post('/', authenticateToken, authorize('Admin'), async (req, res) => {
  try {
    const employee = await prisma.employee.create({
      data: req.body,
      select: {
        id: true,
        fullName: true,
        email: true,
        designation: true,
        phoneNumber: true,
      },
    });

    res.json(employee);
  } catch (error) {
    console.error('Error creating employee:', error);
    res.status(500).json({ error: 'Failed to create employee' });
  }
});

// PUT /api/employees/:id - Update employee
router.put('/:id', authenticateToken, authorize('Admin'), async (req, res) => {
  try {
    const employee = await prisma.employee.update({
      where: { id: req.params.id },
      data: req.body,
      select: {
        id: true,
        fullName: true,
        email: true,
        designation: true,
      },
    });

    res.json(employee);
  } catch (error) {
    console.error('Error updating employee:', error);
    res.status(500).json({ error: 'Failed to update employee' });
  }
});

// DELETE /api/employees/:id - Delete employee
router.delete('/:id', authenticateToken, authorize('Admin'), async (req, res) => {
  try {
    const employee = await prisma.employee.delete({
      where: { id: req.params.id },
    });

    res.json({ message: 'Employee deleted', data: employee });
  } catch (error) {
    console.error('Error deleting employee:', error);
    res.status(500).json({ error: 'Failed to delete employee' });
  }
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
