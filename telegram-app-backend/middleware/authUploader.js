// middleware/authUploader.js
// Allows admin or supplier JWTs for upload endpoints.

const { verifyJwt } = require('../services/jwtService');
const db = require('../config/db');

const parseBearerToken = (req) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  return authHeader.split(' ')[1];
};

const verifyToken = (token, secret) => {
  if (!token || !secret) return null;
  try {
    return verifyJwt(token, secret);
  } catch (error) {
    return null;
  }
};

const authUploader = async (req, res, next) => {
  const token = parseBearerToken(req);
  if (!token) {
    return res.status(401).json({ error: 'Authorization header missing or malformed.' });
  }

  const adminPayload = verifyToken(token, process.env.JWT_ADMIN_SECRET);
  if (adminPayload && adminPayload.role === 'admin') {
    req.actor = { role: 'admin', payload: adminPayload };
    return next();
  }

  const supplierPayload = verifyToken(token, process.env.JWT_SUPPLIER_SECRET);
  if (supplierPayload && supplierPayload.role === 'supplier') {
    const enforceStatus = process.env.ENFORCE_ACCOUNT_STATUS !== 'false';
    if (enforceStatus) {
      const result = await db.query('SELECT is_active FROM suppliers WHERE id = $1', [
        supplierPayload.supplierId,
      ]);
      if (result.rows.length === 0 || result.rows[0].is_active !== true) {
        return res.status(403).json({ error: 'Supplier account is inactive.' });
      }
    }
    req.actor = { role: 'supplier', payload: supplierPayload };
    return next();
  }

  return res.status(401).json({ error: 'Unauthorized: Invalid token.' });
};

module.exports = authUploader;
