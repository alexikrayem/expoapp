// middleware/authUploader.js
// Allows admin or supplier JWTs for upload endpoints.

const { verifyJwt } = require('../services/jwtService');
const db = require('../config/db');

const HTTP = Object.freeze({
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
});

const parseBearerToken = (req) => {
  const authHeader = req?.headers?.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  return authHeader.split(' ')[1] || null;
};

const verifyToken = (token, secret) => {
  if (!token || !secret) return null;
  try {
    return verifyJwt(token, secret);
  } catch (error) {
    return null;
  }
};

const isAccessPayload = (payload, role) =>
  payload?.role === role && payload?.type === 'access';

const shouldEnforceAccountStatus = () => process.env.ENFORCE_ACCOUNT_STATUS !== 'false';

const isSupplierActive = async (supplierId) => {
  const result = await db.query('SELECT is_active FROM suppliers WHERE id = $1', [supplierId]);
  return result.rows.length > 0 && result.rows[0].is_active === true;
};

const resolveAdminActor = (token) => {
  const payload = verifyToken(token, process.env.JWT_ADMIN_SECRET);
  if (!isAccessPayload(payload, 'admin')) {
    return null;
  }

  return { role: 'admin', payload };
};

const resolveSupplierActor = async (token) => {
  const payload = verifyToken(token, process.env.JWT_SUPPLIER_SECRET);
  if (!isAccessPayload(payload, 'supplier')) {
    return null;
  }

  if (!shouldEnforceAccountStatus()) {
    return { role: 'supplier', payload };
  }

  const active = await isSupplierActive(payload.supplierId);
  if (!active) {
    return { inactive: true };
  }

  return { role: 'supplier', payload };
};

const authUploader = async (req, res, next) => {
  const token = parseBearerToken(req);
  if (!token) {
    return res.status(HTTP.UNAUTHORIZED).json({ error: 'Authorization header missing or malformed.' });
  }

  const adminActor = resolveAdminActor(token);
  if (adminActor) {
    req.actor = adminActor;
    return next();
  }

  const supplierResult = await resolveSupplierActor(token);
  if (supplierResult?.inactive) {
    return res.status(HTTP.FORBIDDEN).json({ error: 'Supplier account is inactive.' });
  }

  if (supplierResult) {
    req.actor = supplierResult;
    return next();
  }

  return res.status(HTTP.UNAUTHORIZED).json({ error: 'Unauthorized: Invalid token.' });
};

module.exports = authUploader;
