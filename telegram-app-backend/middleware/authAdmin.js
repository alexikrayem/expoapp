// telegram-app-backend/middleware/authAdmin.js
const { verifyJwt } = require('../services/jwtService');

const HTTP = Object.freeze({
    UNAUTHORIZED: Number.parseInt('401', 10),
    FORBIDDEN: Number.parseInt('403', 10),
    INTERNAL_SERVER_ERROR: Number.parseInt('500', 10),
});

const TOKEN_PREFIX = 'Bearer ';
const ACCESS_TOKEN_TYPE = 'access';
const ADMIN_ROLE = 'admin';

const extractBearerToken = (authHeader) => {
    if (!authHeader || !authHeader.startsWith(TOKEN_PREFIX)) {
        return null;
    }
    const token = authHeader.slice(TOKEN_PREFIX.length).trim();
    return token || null;
};

const verifyAdminAccessToken = (token) => {
    const secret = process.env.JWT_ADMIN_SECRET;
    if (!secret) {
        return { error: { status: HTTP.INTERNAL_SERVER_ERROR, message: 'JWT admin secret not configured.' } };
    }

    const decoded = verifyJwt(token, secret);
    if (decoded.type !== ACCESS_TOKEN_TYPE) {
        return { error: { status: HTTP.FORBIDDEN, message: 'Forbidden: invalid token type.' } };
    }
    if (decoded.role !== ADMIN_ROLE) {
        return { error: { status: HTTP.FORBIDDEN, message: 'Forbidden: Access denied. Not an admin role.' } };
    }
    return { decoded };
};

const mapVerificationError = (error) => {
    if (error.name === 'TokenExpiredError') {
        return { status: HTTP.UNAUTHORIZED, message: 'Unauthorized: Token has expired.' };
    }
    if (error.name === 'JsonWebTokenError') {
        return { status: HTTP.UNAUTHORIZED, message: 'Unauthorized: Invalid token.' };
    }
    return { status: HTTP.INTERNAL_SERVER_ERROR, message: 'Internal server error during token verification.' };
};

const authAdmin = (req, res, next) => {
    const token = extractBearerToken(req.headers.authorization);
    if (!token) {
        return res.status(HTTP.UNAUTHORIZED).json({ message: 'Authorization header is missing or malformed. Expected "Bearer [token]".' });
    }

    try {
        const verification = verifyAdminAccessToken(token);
        if (verification.error) {
            return res.status(verification.error.status).json({ message: verification.error.message });
        }

        req.admin = verification.decoded;
        next();
    } catch (error) {
        console.error("Admin JWT Verification Error:", error.message);
        const mappedError = mapVerificationError(error);
        return res.status(mappedError.status).json({ message: mappedError.message });
    }
};

module.exports = authAdmin;
