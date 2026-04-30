// middleware/authSupplier.js
const { verifyJwt } = require('../services/jwtService');
const db = require('../config/db');

const HTTP = Object.freeze({
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  INTERNAL_SERVER_ERROR: 500,
});

const isBearerHeader = (authorization) =>
  typeof authorization === 'string' && authorization.startsWith('Bearer ');

const getBearerToken = (req) => {
  const authorization = req?.headers?.authorization;
  if (!isBearerHeader(authorization)) {
    return null;
  }
  return authorization.slice(7).trim();
};

const shouldEnforceAccountStatus = () => process.env.ENFORCE_ACCOUNT_STATUS !== 'false';

const isSupplierAccessPayload = (payload) =>
  payload?.role === 'supplier' && payload?.type === 'access';

const isSupplierActive = async (supplierId) => {
  const result = await db.query(
    'SELECT is_active FROM suppliers WHERE id = $1',
    [supplierId]
  );

  return result.rows.length > 0 && result.rows[0].is_active === true;
};

const authSupplier = async (req, res, next) => {
  const token = getBearerToken(req);
  if (!token) {
    return res.status(HTTP.UNAUTHORIZED).json({ error: 'Authorization header missing or malformed.' });
  }

  const secret = process.env.JWT_SUPPLIER_SECRET;
  if (!secret) {
    return res.status(HTTP.INTERNAL_SERVER_ERROR).json({ error: 'JWT supplier secret not configured.' });
  }

  try {
    const decoded = verifyJwt(token, secret);

    if (!isSupplierAccessPayload(decoded)) {
      return res.status(HTTP.FORBIDDEN).json({ error: 'Forbidden: invalid token role or type.' });
    }

    if (shouldEnforceAccountStatus()) {
      const isActive = await isSupplierActive(decoded.supplierId);
      if (!isActive) {
        return res.status(HTTP.FORBIDDEN).json({ error: 'Supplier account is inactive.' });
      }
    }

    req.supplier = decoded;
    return next();
  } catch (error) {
    console.error('JWT verification error:', error.message);
    return res.status(HTTP.UNAUTHORIZED).json({ error: 'Invalid or expired token.' });
  }
};

module.exports = authSupplier;
