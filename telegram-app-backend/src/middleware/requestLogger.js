// telegram-app-backend/src/middleware/requestLogger.js - Request logging middleware
const requestLogger = (req, res, next) => {
    const start = Date.now();
    
    // Sanitize body to avoid leaking sensitive info
    let safeBody = undefined;
    if (req.body && Object.keys(req.body).length > 0) {
        safeBody = { ...req.body };
        const sensitiveFields = ['password', 'passwordConfirm', 'otp', 'token', 'refreshToken', 'secret'];
        for (const field of sensitiveFields) {
            if (field in safeBody) safeBody[field] = '[REDACTED]';
        }
    }

    // Log request
    console.log(`📥 ${req.method} ${req.url}`, {
        timestamp: new Date().toISOString(),
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        ...(safeBody && { body: safeBody }),
        ...(Object.keys(req.query).length > 0 && { query: req.query }),
    });

    // Log response
    res.on('finish', () => {
        const duration = Date.now() - start;
        const statusColor = res.statusCode >= 400 ? '🔴' : '🟢';
        
        console.log(`📤 ${statusColor} ${req.method} ${req.url} - ${res.statusCode}`, {
            duration: `${duration}ms`,
            timestamp: new Date().toISOString(),
        });
    });

    next();
};

module.exports = requestLogger;