// telegram-app-backend/src/middleware/rateLimiter.js - Rate limiting middleware
const rateLimitStore = new Map();

const createRateLimiter = (options = {}) => {
    const {
        windowMs = 15 * 60 * 1000, // 15 minutes
        maxRequests = 100,
        message = 'Too many requests, please try again later',
        keyGenerator = (req) => req.ip,
    } = options;

    return (req, res, next) => {
        const key = keyGenerator(req);
        const now = Date.now();
        
        // Clean up old entries
        for (const [k, data] of rateLimitStore.entries()) {
            if (now - data.resetTime > windowMs) {
                rateLimitStore.delete(k);
            }
        }

        // Get or create rate limit data for this key
        let rateLimitData = rateLimitStore.get(key);
        
        if (!rateLimitData || now - rateLimitData.resetTime > windowMs) {
            rateLimitData = {
                count: 0,
                resetTime: now,
            };
        }

        rateLimitData.count++;
        rateLimitStore.set(key, rateLimitData);

        // Set rate limit headers
        res.set({
            'X-RateLimit-Limit': maxRequests,
            'X-RateLimit-Remaining': Math.max(0, maxRequests - rateLimitData.count),
            'X-RateLimit-Reset': new Date(rateLimitData.resetTime + windowMs).toISOString(),
        });

        if (rateLimitData.count > maxRequests) {
            return res.status(429).json({
                error: message,
                retryAfter: Math.ceil((rateLimitData.resetTime + windowMs - now) / 1000),
            });
        }

        next();
    };
};

module.exports = createRateLimiter;