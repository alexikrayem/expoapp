/**
 * Structured Logger Service for Production
 * 
 * Provides consistent, structured logging with:
 * - JSON format for easy parsing by log aggregators
 * - Request ID tracking for tracing
 * - Log levels (info, warn, error, debug)
 * - Timestamps and context
 */

const IS_PRODUCTION = process.env.NODE_ENV === 'production';

const REDACT_KEYS = [
    /password/i,
    /token/i,
    /secret/i,
    /authorization/i,
    /refresh/i,
    /otp/i,
    /code/i
];

const MASK_KEYS = [
    /email/i,
    /phone/i
];

const maskValue = (value) => {
    if (value === null || value === undefined) return value;
    const text = String(value);
    if (text.length <= 4) return '***';
    return `${text.slice(0, 2)}***${text.slice(-2)}`;
};

const shouldRedactKey = (key) => REDACT_KEYS.some((regex) => regex.test(key));
const shouldMaskKey = (key) => MASK_KEYS.some((regex) => regex.test(key));

const sanitize = (value, depth = 0) => {
    if (depth > 5) return value;
    if (Array.isArray(value)) {
        return value.map((item) => sanitize(item, depth + 1));
    }
    if (value && typeof value === 'object') {
        const sanitized = {};
        for (const [key, entry] of Object.entries(value)) {
            if (shouldRedactKey(key)) {
                sanitized[key] = '[REDACTED]';
                continue;
            }
            if (shouldMaskKey(key)) {
                sanitized[key] = maskValue(entry);
                continue;
            }
            sanitized[key] = sanitize(entry, depth + 1);
        }
        return sanitized;
    }
    return value;
};

const formatLog = (level, message, context = {}) => {
    const safeContext = sanitize(context);
    const logEntry = {
        timestamp: new Date().toISOString(),
        level: level.toUpperCase(),
        message,
        ...safeContext
    };

    // In production, output JSON for log aggregators
    if (IS_PRODUCTION) {
        return JSON.stringify(logEntry);
    }

    // In development, use readable format
    const contextStr = Object.keys(context).length > 0
        ? ` | ${JSON.stringify(context)}`
        : '';
    return `[${logEntry.timestamp}] [${logEntry.level}] ${message}${contextStr}`;
};

const logger = {
    info: (message, context = {}) => {
        console.log(formatLog('info', message, context));
    },

    warn: (message, context = {}) => {
        console.warn(formatLog('warn', message, context));
    },

    error: (message, error = null, context = {}) => {
        const errorContext = { ...context };

        if (error) {
            errorContext.error = error.message;
            if (!IS_PRODUCTION) {
                errorContext.stack = error.stack?.split('\n').slice(0, 5);
            }
        }

        console.error(formatLog('error', message, errorContext));
    },

    debug: (message, context = {}) => {
        if (!IS_PRODUCTION) {
            console.debug(formatLog('debug', message, context));
        }
    },

    // Log HTTP requests
    request: (req, duration = null, statusCode = null) => {
        const context = {
            method: req.method,
            path: req.path,
            requestId: req.requestId,
            ip: req.ip,
            userAgent: req.get('user-agent')?.substring(0, 50)
        };

        if (duration !== null) {
            context.durationMs = duration;
        }

        if (statusCode !== null) {
            context.statusCode = statusCode;
        }

        console.log(formatLog('info', 'HTTP Request', context));
    },

    // Log database queries
    query: (query, durationMs, params = null) => {
        const context = {
            durationMs,
            query: query.substring(0, 100) // Truncate long queries
        };

        if (durationMs > 1000) {
            logger.warn('Slow query detected', context);
        } else if (!IS_PRODUCTION) {
            logger.debug('DB Query', context);
        }
    }
};

module.exports = logger;
