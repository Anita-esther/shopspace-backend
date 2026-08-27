const jwt = require('jsonwebtoken');

// Verifies the JWT sent in the Authorization header (Bearer <token>).
// Attaches the decoded payload (userId, role) to req.user for downstream routes.
function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ status: 'error', message: 'No token provided' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // { userId, role }
    next();
  } catch (err) {
    return res.status(401).json({ status: 'error', message: 'Invalid or expired token' });
  }
}

// Restricts a route to admin users only. Use after requireAuth.
function requireAdmin(req, res, next) {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ status: 'error', message: 'Admin access required' });
  }
  next();
}

module.exports = { requireAuth, requireAdmin };
