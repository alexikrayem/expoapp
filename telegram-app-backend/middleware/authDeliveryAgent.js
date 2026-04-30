// telegram-app-backend/middleware/authDeliveryAgent.js
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

const isDeliveryAccessPayload = (payload) =>
  payload?.role === 'delivery_agent' && payload?.type === 'access';

const isDeliveryAgentActive = async (deliveryAgentId) => {
  const result = await db.query(
    'SELECT is_active FROM delivery_agents WHERE id = $1',
    [deliveryAgentId]
  );

  return result.rows.length > 0 && result.rows[0].is_active === true;
};

const authDeliveryAgent = async (req, res, next) => {
  const token = getBearerToken(req);
  if (!token) {
    return res.status(HTTP.UNAUTHORIZED).json({ error: 'Delivery authorization header missing or malformed.' });
  }

  const secret = process.env.JWT_DELIVERY_SECRET;
  if (!secret) {
    return res.status(HTTP.INTERNAL_SERVER_ERROR).json({ error: 'JWT delivery secret not configured.' });
  }

  try {
    const decoded = verifyJwt(token, secret);

    if (!isDeliveryAccessPayload(decoded)) {
      return res.status(HTTP.FORBIDDEN).json({ error: 'Forbidden: invalid token role or type.' });
    }

    if (shouldEnforceAccountStatus()) {
      const isActive = await isDeliveryAgentActive(decoded.deliveryAgentId);
      if (!isActive) {
        return res.status(HTTP.FORBIDDEN).json({ error: 'Delivery agent account is inactive.' });
      }
    }

    req.deliveryAgent = decoded;
    return next();
  } catch (error) {
    console.error('Delivery Agent JWT verification error:', error.message);
    return res.status(HTTP.UNAUTHORIZED).json({ error: 'Invalid or expired delivery token.' });
  }
};

module.exports = authDeliveryAgent;
