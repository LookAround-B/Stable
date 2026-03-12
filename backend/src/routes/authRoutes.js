const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { prisma } = require('../lib/prisma');
const { authenticateToken } = require('../middleware/auth');

// POST /api/auth/login - Login with email
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Find employee by email
    const employee = await prisma.employee.findUnique({
      where: { email },
      include: {
        permissions: true,
      },
    });

    if (!employee) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Check password
    const passwordMatch = await bcrypt.compare(password, employee.password);
    if (!passwordMatch) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Generate JWT token
    const token = jwt.sign(
      { id: employee.id, email: employee.email, designation: employee.designation },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '24h' }
    );

    // Return user data without password
    const { password: _, ...userWithoutPassword } = employee;
    res.json({
      token,
      user: userWithoutPassword,
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Server error during login' });
  }
});

// POST /api/auth/logout - Logout
router.post('/logout', authenticateToken, (req, res) => {
  // Logout logic
  res.json({ message: 'Logout successful' });
});

// POST /api/auth/profile - Create profile (after initial login)
router.post('/profile', authenticateToken, (req, res) => {
  // Profile creation logic
  res.json({ message: 'Profile creation endpoint' });
});

// GET /api/auth/me - Get current user
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const employee = await prisma.employee.findUnique({
      where: { id: req.user.id },
      include: {
        permissions: true,
      },
    });

    if (!employee) {
      return res.status(404).json({ error: 'User not found' });
    }

    const { password: _, ...userWithoutPassword } = employee;
    res.json(userWithoutPassword);
  } catch (error) {
    console.error('Get me error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
