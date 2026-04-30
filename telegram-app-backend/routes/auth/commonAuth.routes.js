const express = require('express');
const router = express.Router();
const { rotateRefreshToken, revokeRefreshToken } = require('../../services/tokenService');
const logger = require('../../services/logger');
const { recordAuditEvent } = require('../../services/auditService');
const {
    HTTP,
    refreshLimiter,
    setAuthCookies,
    clearAuthCookies,
    withOptionalRefreshToken,
    getRefreshTokenFromRequest,
    getCookieCsrfFailureReason
} = require('./authUtils');

// Refresh token endpoint
router.post('/refresh', refreshLimiter, async (req, res) => {
    const { token: refreshToken, source: refreshTokenSource } = getRefreshTokenFromRequest(req);

    if (!refreshToken) {
        void recordAuditEvent({
            req,
            action: 'refresh_failed',
            actorRole: null,
            actorId: null,
            targetType: 'auth',
            targetId: null,
            metadata: { reason: 'missing_token' }
        });
        return res.status(HTTP.UNAUTHORIZED).json({ error: 'Refresh token required' });
    }

    const csrfFailureReason = refreshTokenSource === 'cookie' ? getCookieCsrfFailureReason(req) : null;
    if (csrfFailureReason) {
        void recordAuditEvent({
            req,
            action: 'refresh_failed',
            actorRole: null,
            actorId: null,
            targetType: 'auth',
            targetId: null,
            metadata: { reason: `csrf_${csrfFailureReason}` }
        });
        return res.status(HTTP.FORBIDDEN).json({ error: 'CSRF validation failed for cookie-authenticated request.' });
    }

    try {
        const { accessToken, refreshToken: newRefreshToken } = await rotateRefreshToken({
            token: refreshToken,
            ip: req.ip,
            userAgent: req.get('user-agent')
        });

        setAuthCookies(res, newRefreshToken);
        res.json(withOptionalRefreshToken({ accessToken }, newRefreshToken));
    } catch (error) {
        logger.error('Refresh token error', error);
        void recordAuditEvent({
            req,
            action: 'refresh_failed',
            actorRole: null,
            actorId: null,
            targetType: 'auth',
            targetId: null,
            metadata: { reason: error.message }
        });
        return res.status(HTTP.FORBIDDEN).json({ error: error.message || 'Invalid or expired refresh token' });
    }
});

// Logout (revoke refresh token)
router.post('/logout', async (req, res) => {
    try {
        const { token: refreshToken, source: refreshTokenSource } = getRefreshTokenFromRequest(req);

        const csrfFailureReason = refreshTokenSource === 'cookie' ? getCookieCsrfFailureReason(req) : null;
        if (csrfFailureReason) {
            void recordAuditEvent({
                req,
                action: 'logout_failed',
                actorRole: null,
                actorId: null,
                targetType: 'auth',
                targetId: null,
                metadata: { reason: `csrf_${csrfFailureReason}` }
            });
            return res.status(HTTP.FORBIDDEN).json({ error: 'CSRF validation failed for cookie-authenticated request.' });
        }

        if (refreshToken) {
            await revokeRefreshToken(refreshToken);
        }
        clearAuthCookies(res);
        void recordAuditEvent({
            req,
            action: 'logout',
            actorRole: null,
            actorId: null,
            targetType: 'auth',
            targetId: null
        });
        res.json({ message: 'Logged out' });
    } catch (error) {
        logger.error('Logout error', error);
        clearAuthCookies(res);
        res.status(HTTP.INTERNAL_SERVER_ERROR).json({ error: 'Failed to logout' });
    }
});

module.exports = router;
