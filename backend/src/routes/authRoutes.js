const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const axios = require('axios');
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
      process.env.JWT_SECRET || 'dev-only-insecure-secret',
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

// POST /api/auth/google - Google OAuth sign-in
router.post('/google', async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ error: 'Google access token is required' });
    }

    // Fetch user info from Google using the access token
    let googleUser;
    try {
      const response = await axios.get('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: { Authorization: `Bearer ${token}` },
      });
      googleUser = response.data;
    } catch (err) {
      return res.status(401).json({ error: 'Invalid or expired Google token' });
    }

    const { email, name, picture } = googleUser;

    if (!email) {
      return res.status(401).json({ error: 'Unable to retrieve email from Google' });
    }

    // Find or create employee
    let employee = await prisma.employee.findUnique({
      where: { email },
      include: { permissions: true },
    });

    if (!employee) {
      const randomPassword = Math.random().toString(36).slice(-12) + Math.random().toString(36).slice(-12);
      const hashedPassword = await bcrypt.hash(randomPassword, 10);

      employee = await prisma.employee.create({
        data: {
          fullName: name || email.split('@')[0],
          email,
          password: hashedPassword,
          profileImage: picture || null,
          designation: 'Groom',
          department: 'Stable Operations',
          employmentStatus: 'Active',
          isApproved: false,
        },
        include: { permissions: true },
      });
    }

    const jwtToken = jwt.sign(
      { id: employee.id, email: employee.email, designation: employee.designation },
      process.env.JWT_SECRET || 'dev-only-insecure-secret',
      { expiresIn: '24h' }
    );

    const { password: _, ...userWithoutPassword } = employee;
    return res.json({ token: jwtToken, user: userWithoutPassword });
  } catch (error) {
    console.error('Google auth error:', error);
    res.status(500).json({ error: 'Server error during Google authentication' });
  }
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
