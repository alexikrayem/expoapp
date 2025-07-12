// telegram-app-backend/src/utils/errorHandler.js - Centralized error handling
class AppError extends Error {
    constructor(message, statusCode = 500, code = null) {
        super(message);
        this.statusCode = statusCode;
        this.code = code;
        this.isOperational = true;

        Error.captureStackTrace(this, this.constructor);
    }
}

class ValidationError extends AppError {
    constructor(message, field = null) {
        super(message, 400, 'VALIDATION_ERROR');
        this.field = field;
    }
}

class NotFoundError extends AppError {
    constructor(resource = 'Resource') {
        super(`${resource} not found`, 404, 'NOT_FOUND');
    }
}

class UnauthorizedError extends AppError {
    constructor(message = 'Unauthorized access') {
        super(message, 401, 'UNAUTHORIZED');
    }
}

class ForbiddenError extends AppError {
    constructor(message = 'Forbidden access') {
        super(message, 403, 'FORBIDDEN');
    }
}

const handleError = (error, req, res, next) => {
    let { statusCode = 500, message, code } = error;

    // Log error for debugging
    console.error('Error occurred:', {
        message: error.message,
        stack: error.stack,
        url: req.url,
        method: req.method,
        timestamp: new Date().toISOString(),
    });

    // Handle specific error types
    if (error.code === '23505') { // PostgreSQL unique violation
        statusCode = 409;
        message = 'Resource already exists';
        code = 'DUPLICATE_RESOURCE';
    } else if (error.code === '23503') { // PostgreSQL foreign key violation
        statusCode = 400;
        message = 'Referenced resource does not exist';
        code = 'INVALID_REFERENCE';
    } else if (error.name === 'JsonWebTokenError') {
        statusCode = 401;
        message = 'Invalid token';
        code = 'INVALID_TOKEN';
    } else if (error.name === 'TokenExpiredError') {
        statusCode = 401;
        message = 'Token expired';
        code = 'TOKEN_EXPIRED';
    }

    // Don't expose internal errors in production
    if (statusCode === 500 && process.env.NODE_ENV === 'production') {
        message = 'Internal server error';
    }

    res.status(statusCode).json({
        error: message,
        code,
        ...(process.env.NODE_ENV === 'development' && { stack: error.stack }),
    });
};

const asyncHandler = (fn) => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = {
    AppError,
    ValidationError,
    NotFoundError,
    UnauthorizedError,
    ForbiddenError,
    handleError,
    asyncHandler,
};