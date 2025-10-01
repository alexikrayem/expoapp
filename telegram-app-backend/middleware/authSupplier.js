// middleware/authSupplier.js
const jwt = require('jsonwebtoken');

const authSupplier = (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7, authHeader.length); // Remove "Bearer "
        try {
            if (!process.env.JWT_SECRET) {
                console.error('❌ JWT_SECRET not configured');
                return res.status(500).json({ error: 'Server configuration error' });
            }
            
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            console.log(`✅ Supplier authenticated: ${decoded.name} (ID: ${decoded.supplierId})`);
            req.supplier = decoded; // Add decoded supplier info (supplierId, name, email) to request object
            next(); // Proceed to the next middleware or route handler
        } catch (error) {
            console.error("JWT verification error:", error.message);
            if (error.name === 'TokenExpiredError') {
                return res.status(401).json({ error: 'Token expired. Please login again.' });
            }
            return res.status(401).json({ error: 'Invalid token. Please login again.' });
        }
    } else {
        console.log('❌ Missing or malformed authorization header');
        return res.status(401).json({ error: 'Authorization header missing or malformed.' });
    }
};

module.exports = authSupplier;