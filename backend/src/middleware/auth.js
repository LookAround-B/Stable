const jwt = require('jsonwebtoken');

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key', (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
};

const authorize = (...roles) => {
  return (req, res, next) => {
    // Check both 'role' and 'designation' for flexibility
    const userRole = req.user.role || req.user.designation;
    if (!userRole || !roles.includes(userRole)) {
      return res.status(403).json({ error: 'Unauthorized role' });
    }
    next();
  };
};

module.exports = { authenticateToken, authorize };
