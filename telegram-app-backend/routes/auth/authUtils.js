const crypto = require('crypto');
const rateLimit = require('express-rate-limit');
const RateLimitRedis = require('rate-limit-redis');
const RedisStore = RateLimitRedis.default || RateLimitRedis;
const { getRedisClient } = require('../../config/redis');
const { normalizePhoneNumber } = require('../../utils/phoneNumber');
const { getClientKey } = require('../../utils/rateLimitKey');
const db = require('../../config/db');

const isDev = process.env.NODE_ENV !== 'production';
const defaultPhoneCountryCode = String(process.env.DEFAULT_PHONE_COUNTRY_CODE || '').replace(/\D/g, '');

const HTTP = Object.freeze({
    BAD_REQUEST: Number.parseInt('400', 10),
    UNAUTHORIZED: Number.parseInt('401', 10),
    FORBIDDEN: Number.parseInt('403', 10),
    CONFLICT: Number.parseInt('409', 10),
    TOO_MANY_REQUESTS: Number.parseInt('429', 10),
    INTERNAL_SERVER_ERROR: Number.parseInt('500', 10)
});

const NUMERIC_LIMITS = Object.freeze({
    DEV_LIMIT_STANDARD: Number.parseInt('200', 10),
    DEV_LIMIT_OTP_VERIFY: Number.parseInt('100', 10),
    DEV_OTP_SEND_LIMIT: Number.parseInt('50', 10),
    OTP_MIN_CODE: Number.parseInt('100000', 10),
    OTP_MAX_CODE: Number.parseInt('1000000', 10),
    OTP_EXPIRY_MINUTES: 5
});

const TIME_MS = Object.freeze({
    SECOND: Number.parseInt('1000', 10),
    MINUTE: Number.parseInt('60', 10),
    HOUR: Number.parseInt('60', 10),
    DAY: Number.parseInt('24', 10)
});

const OTP_EXPIRY_MS = NUMERIC_LIMITS.OTP_EXPIRY_MINUTES * TIME_MS.MINUTE * TIME_MS.SECOND;

const buildRateLimitStore = () => {
    const redisClient = getRedisClient();
    if (!redisClient) return undefined;
    return new RedisStore({
        sendCommand: (...args) => redisClient.sendCommand(args),
    });
};

const otpSendLimiter = rateLimit({
    windowMs: 10 * TIME_MS.MINUTE * TIME_MS.SECOND,
    max: isDev ? NUMERIC_LIMITS.DEV_OTP_SEND_LIMIT : 5,
    standardHeaders: true,
    legacyHeaders: false,
    store: buildRateLimitStore(),
    keyGenerator: (req) => `otp-send:${getClientKey(req)}:${normalizePhoneNumber(req.body?.phone_number, defaultPhoneCountryCode) || 'unknown'}`,
    message: { error: 'Too many OTP requests. Please try again later.' },
});

const otpVerifyLimiter = rateLimit({
    windowMs: 10 * TIME_MS.MINUTE * TIME_MS.SECOND,
    max: isDev ? NUMERIC_LIMITS.DEV_LIMIT_OTP_VERIFY : 10,
    standardHeaders: true,
    legacyHeaders: false,
    store: buildRateLimitStore(),
    keyGenerator: (req) => `otp-verify:${getClientKey(req)}:${normalizePhoneNumber(req.body?.phone_number, defaultPhoneCountryCode) || 'unknown'}`,
    message: { error: 'Too many OTP verification attempts. Please try again later.' },
});

const loginLimiter = rateLimit({
    windowMs: 15 * TIME_MS.MINUTE * TIME_MS.SECOND,
    max: isDev ? NUMERIC_LIMITS.DEV_LIMIT_STANDARD : 10,
    standardHeaders: true,
    legacyHeaders: false,
    store: buildRateLimitStore(),
    keyGenerator: (req) => `login:${getClientKey(req)}:${req.body?.email || req.body?.phoneNumber || 'unknown'}`,
    message: { error: 'Too many login attempts. Please try again later.' },
});

const refreshLimiter = rateLimit({
    windowMs: 10 * TIME_MS.MINUTE * TIME_MS.SECOND,
    max: isDev ? NUMERIC_LIMITS.DEV_LIMIT_STANDARD : 30,
    standardHeaders: true,
    legacyHeaders: false,
    store: buildRateLimitStore(),
    keyGenerator: (req) => `refresh:${getClientKey(req)}`,
    message: { error: 'Too many refresh attempts. Please try again later.' },
});

const hashIdentifier = (value) => {
    if (!value) return null;
    return crypto.createHash('sha256').update(String(value)).digest('hex');
};

const resolveOtpHashSecret = () =>
    process.env.OTP_HASH_SECRET ||
    process.env.JWT_SECRET ||
    process.env.JWT_CUSTOMER_SECRET ||
    'dev-insecure-otp-secret';

const hashOtpCode = (phoneNumber, code) => {
    return crypto
        .createHmac('sha256', resolveOtpHashSecret())
        .update(`${phoneNumber}:${String(code || '').trim()}`)
        .digest('hex');
};

const safeStringEqual = (left, right) => {
    if (typeof left !== 'string' || typeof right !== 'string') return false;
    const leftBuffer = Buffer.from(left, 'utf8');
    const rightBuffer = Buffer.from(right, 'utf8');
    if (leftBuffer.length !== rightBuffer.length) return false;
    return crypto.timingSafeEqual(leftBuffer, rightBuffer);
};

const isLegacyOtpCode = (value) => typeof value === 'string' && /^\d{6}$/.test(value);

const AUTH_COOKIE_PATH = '/api/auth';
const CSRF_COOKIE_NAME = 'csrfToken';

const buildCookieOptions = () => ({
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'Strict' : 'Lax',
    maxAge: 7 * TIME_MS.DAY * TIME_MS.HOUR * TIME_MS.MINUTE * TIME_MS.SECOND,
    path: AUTH_COOKIE_PATH,
    ...(process.env.COOKIE_DOMAIN ? { domain: process.env.COOKIE_DOMAIN } : {})
});

const clearCookieOptions = (cookieOptions) => {
    const { maxAge, ...rest } = cookieOptions;
    return rest;
};

const buildCsrfCookieOptions = () => ({
    httpOnly: false,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'Strict' : 'Lax',
    maxAge: 7 * TIME_MS.DAY * TIME_MS.HOUR * TIME_MS.MINUTE * TIME_MS.SECOND,
    path: AUTH_COOKIE_PATH,
    ...(process.env.COOKIE_DOMAIN ? { domain: process.env.COOKIE_DOMAIN } : {})
});

const issueCsrfToken = () => crypto.randomBytes(32).toString('hex');

const setRefreshCookie = (res, refreshToken) => {
    res.cookie('refreshToken', refreshToken, buildCookieOptions());
};

const clearRefreshCookie = (res) => {
    res.clearCookie('refreshToken', clearCookieOptions(buildCookieOptions()));
};

const setCsrfCookie = (res, csrfToken = issueCsrfToken()) => {
    res.cookie(CSRF_COOKIE_NAME, csrfToken, buildCsrfCookieOptions());
    return csrfToken;
};

const clearCsrfCookie = (res) => {
    res.clearCookie(CSRF_COOKIE_NAME, clearCookieOptions(buildCsrfCookieOptions()));
};

const setAuthCookies = (res, refreshToken) => {
    setRefreshCookie(res, refreshToken);
    setCsrfCookie(res);
};

const clearAuthCookies = (res) => {
    clearRefreshCookie(res);
    clearCsrfCookie(res);
};

const exposeRefreshTokenInBody = process.env.EXPOSE_REFRESH_TOKEN_IN_BODY === 'true';
const withOptionalRefreshToken = (payload, refreshToken) => {
    if (!exposeRefreshTokenInBody) return payload;
    return { ...payload, refreshToken };
};

const getRefreshTokenFromRequest = (req) => {
    const authHeader = req.headers.authorization;
    const headerToken = authHeader && authHeader.startsWith('Bearer ')
        ? authHeader.split(' ')[1]
        : null;

    if (req.cookies?.refreshToken) {
        return { token: req.cookies.refreshToken, source: 'cookie' };
    }
    if (headerToken) {
        return { token: headerToken, source: 'header' };
    }
    if (req.body?.refreshToken) {
        return { token: req.body.refreshToken, source: 'body' };
    }
    return { token: null, source: null };
};

const getRequestOrigin = (req) => {
    const origin = req.get('origin');
    if (origin) return origin;

    const referer = req.get('referer');
    if (!referer) return null;
    try {
        return new URL(referer).origin;
    } catch (_error) {
        return null;
    }
};

const getTrustedOrigins = (req) => {
    const configuredOrigins = (process.env.CORS_ORIGINS || '')
        .split(',')
        .map((value) => value.trim())
        .filter(Boolean);

    const forwardedProto = (req.get('x-forwarded-proto') || '').split(',')[0].trim();
    const protocol = forwardedProto || req.protocol || 'http';
    const forwardedHost = (req.get('x-forwarded-host') || '').split(',')[0].trim();
    const host = forwardedHost || req.get('host');
    const sameOrigin = host ? `${protocol}://${host}` : null;

    if (sameOrigin) {
        configuredOrigins.push(sameOrigin);
    }

    return new Set(configuredOrigins);
};

const getCookieCsrfFailureReason = (req) => {
    if (!req.cookies?.refreshToken) {
        return null;
    }

    const requestOrigin = getRequestOrigin(req);
    const trustedOrigins = getTrustedOrigins(req);
    if (!requestOrigin || !trustedOrigins.has(requestOrigin)) {
        return 'origin';
    }

    const csrfHeader = req.get('x-csrf-token') || req.get('x-xsrf-token');
    const csrfCookie = req.cookies?.[CSRF_COOKIE_NAME];
    if (!csrfHeader || !csrfCookie) {
        return 'token';
    }
    if (!safeStringEqual(String(csrfHeader || ''), String(csrfCookie || ''))) {
        return 'token';
    }

    return null;
};

const generateSecureUserId = async () => {
    // 48-bit ID: safe integer in JS, large enough to avoid collisions
    for (let attempt = 0; attempt < 5; attempt++) {
        const candidate = crypto.randomBytes(6).readUIntBE(0, 6);
        const exists = await db.query('SELECT 1 FROM user_profiles WHERE user_id = $1', [candidate]);
        if (exists.rows.length === 0) {
            return candidate;
        }
    }
    throw new Error('Failed to generate unique user ID');
};

module.exports = {
    HTTP,
    NUMERIC_LIMITS,
    OTP_EXPIRY_MS,
    defaultPhoneCountryCode,
    otpSendLimiter,
    otpVerifyLimiter,
    loginLimiter,
    refreshLimiter,
    hashIdentifier,
    hashOtpCode,
    safeStringEqual,
    isLegacyOtpCode,
    setAuthCookies,
    clearAuthCookies,
    withOptionalRefreshToken,
    getRefreshTokenFromRequest,
    getCookieCsrfFailureReason,
    generateSecureUserId
};
