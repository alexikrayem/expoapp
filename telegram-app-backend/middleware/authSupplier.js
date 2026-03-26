// middleware/authSupplier.js
const { verifyJwt } = require('../services/jwtService');
const db = require('../config/db');

const authSupplier = async (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Authorization header missing or malformed.' });
    }

    const token = authHeader.substring(7, authHeader.length); // Remove "Bearer "
    try {
        const secret = process.env.JWT_SUPPLIER_SECRET;
        if (!secret) {
            return res.status(500).json({ error: 'JWT supplier secret not configured.' });
        }
        const decoded = verifyJwt(token, secret);
        if (decoded.role !== 'supplier') {
            return res.status(403).json({ error: 'Forbidden: invalid token role.' });
        }

        const enforceStatus = process.env.ENFORCE_ACCOUNT_STATUS !== 'false';
        if (enforceStatus) {
            const result = await db.query(
                'SELECT is_active FROM suppliers WHERE id = $1',
                [decoded.supplierId]
            );
            if (result.rows.length === 0 || result.rows[0].is_active !== true) {
                return res.status(403).json({ error: 'Supplier account is inactive.' });
            }
        }

        req.supplier = decoded; // Add decoded supplier info (supplierId, name, email) to request object
        next(); // Proceed to the next middleware or route handler
    } catch (error) {
        console.error("JWT verification error:", error.message);
        return res.status(401).json({ error: 'Invalid or expired token.' });
    }
};

module.exports = authSupplier;
