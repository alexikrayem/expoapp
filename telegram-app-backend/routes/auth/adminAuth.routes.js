const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const bcrypt = require('bcrypt');
const db = require('../../config/db');
const logger = require('../../services/logger');
const { issueTokens } = require('../../services/tokenService');
const { recordAuditEvent } = require('../../services/auditService');
const validateRequest = require('../../middleware/validateRequest');
const {
    HTTP,
    loginLimiter,
    hashIdentifier,
    setAuthCookies,
    withOptionalRefreshToken
} = require('./authUtils');

// Admin Login
router.post('/admin/login', loginLimiter, [
    body('email').isEmail().withMessage('Please provide a valid email'),
    body('password').notEmpty().withMessage('Password is required'),
    validateRequest
], async (req, res) => {
    try {
        const { email, password } = req.body;

        const adminQuery = `
            SELECT id, email, full_name, role, password_hash
            FROM admins
            WHERE email = $1
        `;
        const adminResult = await db.query(adminQuery, [email.toLowerCase()]);

        if (adminResult.rows.length === 0) {
            // Still hash the password to prevent timing attacks
            await bcrypt.compare(password, '$2b$10$NQ4q9yO6jRZ5pZ4q9yO6jRZ5pZ4q9yO6jRZ5pZ4q9yO6jRZ5pZ4q9y'); // dummy hash
            void recordAuditEvent({
                req,
                action: 'login_failed',
                actorRole: 'admin',
                actorId: null,
                targetType: 'admin',
                targetId: null,
                metadata: { identifier_hash: hashIdentifier(email.toLowerCase()) }
            });
            return res.status(HTTP.UNAUTHORIZED).json({ error: 'Invalid credentials' });
        }

        const admin = adminResult.rows[0];

        const isValidPassword = await bcrypt.compare(password, admin.password_hash);
        if (!isValidPassword) {
            void recordAuditEvent({
                req,
                action: 'login_failed',
                actorRole: 'admin',
                actorId: admin.id,
                targetType: 'admin',
                targetId: admin.id,
                metadata: { identifier_hash: hashIdentifier(email.toLowerCase()) }
            });
            return res.status(HTTP.UNAUTHORIZED).json({ error: 'Invalid credentials' });
        }

        const { accessToken, refreshToken } = await issueTokens({
            payload: { adminId: admin.id, email: admin.email, name: admin.full_name, role: 'admin' },
            role: 'ADMIN',
            ip: req.ip,
            userAgent: req.get('user-agent')
        });

        setAuthCookies(res, refreshToken);

        void recordAuditEvent({
            req,
            action: 'login_success',
            actorRole: 'admin',
            actorId: admin.id,
            targetType: 'admin',
            targetId: admin.id
        });
        res.json(withOptionalRefreshToken({
            accessToken,
            admin: { id: admin.id, name: admin.full_name, email: admin.email, role: admin.role }
        }, refreshToken));

    } catch (error) {
        logger.error('Admin login error', error);
        res.status(HTTP.INTERNAL_SERVER_ERROR).json({ error: 'Internal server error' });
    }
});

module.exports = router;
