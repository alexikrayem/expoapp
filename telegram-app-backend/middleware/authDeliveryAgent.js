// telegram-app-backend/middleware/authDeliveryAgent.js
const { verifyJwt } = require('../services/jwtService');
const db = require('../config/db');

const authDeliveryAgent = async (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Delivery authorization header missing or malformed.' });
    }

    const token = authHeader.substring(7);
    try {
        const secret = process.env.JWT_DELIVERY_SECRET;
        if (!secret) {
            return res.status(500).json({ error: 'JWT delivery secret not configured.' });
        }
        const decoded = verifyJwt(token, secret); // Use DELIVERY secret
        if (decoded.role !== 'delivery_agent') {
            return res.status(403).json({ error: 'Forbidden: invalid token role.' });
        }

        const enforceStatus = process.env.ENFORCE_ACCOUNT_STATUS !== 'false';
        if (enforceStatus) {
            const result = await db.query(
                'SELECT is_active FROM delivery_agents WHERE id = $1',
                [decoded.deliveryAgentId]
            );
            if (result.rows.length === 0 || result.rows[0].is_active !== true) {
                return res.status(403).json({ error: 'Delivery agent account is inactive.' });
            }
        }

        req.deliveryAgent = decoded; // Add decoded info (deliveryAgentId, supplierId, name, role)
        next();
    } catch (error) {
        console.error("Delivery Agent JWT verification error:", error.message);
        return res.status(401).json({ error: 'Invalid or expired delivery token.' });
    }
};
module.exports = authDeliveryAgent;
