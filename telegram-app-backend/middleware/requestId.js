/**
 * Request ID Middleware
 * 
 * Adds a unique request ID to each request for tracing across logs.
 * The ID is also returned in response headers for client-side correlation.
 */

const crypto = require('crypto');

const requestIdMiddleware = (req, res, next) => {
    // Generate unique request ID or use one from header (for distributed tracing)
    const requestId = req.get('X-Request-ID') || crypto.randomUUID();

    req.requestId = requestId;
    res.set('X-Request-ID', requestId);

    next();
};

module.exports = requestIdMiddleware;
