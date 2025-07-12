// telegram-app-backend/src/middleware/requestLogger.js - Request logging middleware
const requestLogger = (req, res, next) => {
    const start = Date.now();
    
    // Log request
    console.log(`📥 ${req.method} ${req.url}`, {
        timestamp: new Date().toISOString(),
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        ...(Object.keys(req.body).length > 0 && { body: req.body }),
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