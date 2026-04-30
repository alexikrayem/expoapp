// telegram-app-backend/src/utils/errorHandler.js - Centralized error handling
const HTTP = Object.freeze({
    BAD_REQUEST: Number.parseInt('400', 10),
    UNAUTHORIZED: Number.parseInt('401', 10),
    FORBIDDEN: Number.parseInt('403', 10),
    NOT_FOUND: Number.parseInt('404', 10),
    CONFLICT: Number.parseInt('409', 10),
    INTERNAL_SERVER_ERROR: Number.parseInt('500', 10),
});

const DB_ERROR_MAP = Object.freeze({
    '23505': {
        statusCode: HTTP.CONFLICT,
        message: 'Resource already exists',
        code: 'DUPLICATE_RESOURCE',
    },
    '23503': {
        statusCode: HTTP.BAD_REQUEST,
        message: 'Referenced resource does not exist',
        code: 'INVALID_REFERENCE',
    },
});

const TOKEN_ERROR_MAP = Object.freeze({
    JsonWebTokenError: {
        statusCode: HTTP.UNAUTHORIZED,
        message: 'Invalid token',
        code: 'INVALID_TOKEN',
    },
    TokenExpiredError: {
        statusCode: HTTP.UNAUTHORIZED,
        message: 'Token expired',
        code: 'TOKEN_EXPIRED',
    },
});

class AppError extends Error {
    constructor(message, statusCode = HTTP.INTERNAL_SERVER_ERROR, code = null) {
        super(message);
        this.statusCode = statusCode;
        this.code = code;
        this.isOperational = true;

        Error.captureStackTrace(this, this.constructor);
    }
}

class ValidationError extends AppError {
    constructor(message, field = null) {
        super(message, HTTP.BAD_REQUEST, 'VALIDATION_ERROR');
        this.field = field;
    }
}

class NotFoundError extends AppError {
    constructor(resource = 'Resource') {
        super(`${resource} not found`, HTTP.NOT_FOUND, 'NOT_FOUND');
    }
}

class UnauthorizedError extends AppError {
    constructor(message = 'Unauthorized access') {
        super(message, HTTP.UNAUTHORIZED, 'UNAUTHORIZED');
    }
}

class ForbiddenError extends AppError {
    constructor(message = 'Forbidden access') {
        super(message, HTTP.FORBIDDEN, 'FORBIDDEN');
    }
}

const mapKnownError = (error) => {
    if (error?.code && DB_ERROR_MAP[error.code]) {
        return DB_ERROR_MAP[error.code];
    }
    if (error?.name && TOKEN_ERROR_MAP[error.name]) {
        return TOKEN_ERROR_MAP[error.name];
    }
    return null;
};

const resolveResponseError = (error) => {
    const mapped = mapKnownError(error);
    if (mapped) {
        return mapped;
    }
    return {
        statusCode: error?.statusCode ?? HTTP.INTERNAL_SERVER_ERROR,
        message: error?.message,
        code: error?.code,
    };
};

const sanitizeErrorMessage = ({ statusCode, message }) => {
    if (statusCode !== HTTP.INTERNAL_SERVER_ERROR) {
        return message;
    }
    if (process.env.NODE_ENV === 'production') {
        return 'Internal server error';
    }
    return message;
};

const handleError = function (error, req, res, next) {
    const resolvedError = resolveResponseError(error);
    const safeMessage = sanitizeErrorMessage(resolvedError);

    // Log error for debugging
    console.error('Error occurred:', {
        message: error.message,
        stack: error.stack,
        url: req.url,
        method: req.method,
        timestamp: new Date().toISOString(),
    });

    res.status(resolvedError.statusCode).json({
        error: safeMessage,
        code: resolvedError.code,
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
