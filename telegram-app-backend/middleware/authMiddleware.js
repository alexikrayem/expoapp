const jwt = require('jsonwebtoken');

const validateTelegramAuth = (req, res, next) => {
  const isDevRequest = req.header('X-Dev-Bypass-Auth');
  const isLocalhost =
    req.ip === '127.0.0.1' ||
    req.ip === '::1' ||
    req.ip.startsWith('::ffff:127.0.0.1');

  // Development bypass
  if (process.env.NODE_ENV === 'development' && isDevRequest && isLocalhost) {
    if (isDevRequest === process.env.DEV_BYPASS_SECRET) {
      console.warn('⚠️  Bypassing auth for local development.');
      req.user = { userId: 123456789, telegramId: 123456789, first_name: 'Local', last_name: 'Dev', role: 'customer' };
      return next();
    }
  }

  // Get token from header
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Access token required.' });
  }

  const token = authHeader.split(' ')[1];

  try {
    // Verify the JWT token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || process.env.JWT_CUSTOMER_SECRET);
    
    // Add user information to request object
    req.user = decoded;
    next();
  } catch (error) {
    console.warn('JWT verification failed:', error.message);
    return res.status(403).json({ message: 'Invalid or expired token.' });
  }

};

module.exports = { validateTelegramAuth };
