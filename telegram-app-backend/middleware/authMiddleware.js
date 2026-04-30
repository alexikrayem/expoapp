const { verifyJwt } = require('../services/jwtService');

const validateTelegramAuth = (req, res, next) => {
  // Development bypass REMOVED for security
  // The X-Dev-Bypass-Auth header logic has been removed to prevent potential production backdoors.

  // Get token from header
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Access token required.' });
  }

  const token = authHeader.split(' ')[1];

  try {
    // Verify the JWT token (prefer customer-specific secret)
    const secret = process.env.JWT_CUSTOMER_SECRET || process.env.JWT_SECRET;
    if (!secret) {
      return res.status(500).json({ message: 'JWT secret not configured.' });
    }
    const decoded = verifyJwt(token, secret);

    // Enforce customer role to prevent role confusion
    if (decoded.role !== 'customer') {
      return res.status(403).json({ message: 'Forbidden: invalid token role.' });
    }
    if (decoded.type !== 'access') {
      return res.status(403).json({ message: 'Forbidden: invalid token type.' });
    }

    // Add user information to request object
    req.user = decoded;
    next();
  } catch (error) {
    console.warn('JWT verification failed:', error.message);
    return res.status(403).json({ message: 'Invalid or expired token.' });
  }

};

module.exports = { validateTelegramAuth };
