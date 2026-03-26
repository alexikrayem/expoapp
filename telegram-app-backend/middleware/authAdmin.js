// telegram-app-backend/middleware/authAdmin.js
const { verifyJwt } = require('../services/jwtService');

const authAdmin = (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ message: 'Authorization header is missing or malformed. Expected "Bearer [token]".' });
    }

    const token = authHeader.split(' ')[1]; // Get token from "Bearer <token>"

    if (!token) {
        return res.status(401).json({ message: 'No token provided.' });
    }

    try {
        const secret = process.env.JWT_ADMIN_SECRET;
        if (!secret) {
            return res.status(500).json({ message: 'JWT admin secret not configured.' });
        }
        // Verify the token using the ADMIN specific secret
        const decoded = verifyJwt(token, secret);

        // Attach decoded payload (admin info) to the request object
        req.admin = decoded; // e.g., req.admin will have { adminId, email, role, name }
        
        // Check if the role is indeed 'admin' (optional, but good for explicitness if your JWT might be used for other roles)
        if (decoded.role !== 'admin') {
            return res.status(403).json({ message: 'Forbidden: Access denied. Not an admin role.' });
        }
        
        next(); // Proceed to the next middleware or route handler
    } catch (error) {
        console.error("Admin JWT Verification Error:", error.message);
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ message: 'Unauthorized: Token has expired.' });
        }
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({ message: 'Unauthorized: Invalid token.' });
        }
        return res.status(500).json({ message: 'Internal server error during token verification.' });
    }
};

module.exports = authAdmin;
