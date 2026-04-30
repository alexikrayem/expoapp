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

// Supplier Login
router.post('/supplier/login', loginLimiter, [
    body('email').isEmail().withMessage('Please provide a valid email'),
    body('password').notEmpty().withMessage('Password is required'),
    validateRequest
], async (req, res) => {
    try {
        const { email, password } = req.body;

        // Find supplier by email
        const supplierQuery = `
            SELECT id, name, email, category, location, password_hash, is_active
            FROM suppliers
            WHERE email = $1 AND is_active = true
        `;
        const supplierResult = await db.query(supplierQuery, [email.toLowerCase()]);

        // Don't distinguish between user not found vs wrong password to prevent enumeration
        if (supplierResult.rows.length === 0) {
            // Still hash the password to prevent timing attacks
            await bcrypt.compare(password, '$2b$10$NQ4q9yO6jRZ5pZ4q9yO6jRZ5pZ4q9yO6jRZ5pZ4q9yO6jRZ5pZ4q9y'); // dummy hash
            void recordAuditEvent({
                req,
                action: 'login_failed',
                actorRole: 'supplier',
                actorId: null,
                targetType: 'supplier',
                targetId: null,
                metadata: { identifier_hash: hashIdentifier(email.toLowerCase()) }
            });
            return res.status(HTTP.UNAUTHORIZED).json({ error: 'Invalid credentials' });
        }

        const supplier = supplierResult.rows[0];

        // Check password
        const isValidPassword = await bcrypt.compare(password, supplier.password_hash);
        if (!isValidPassword) {
            void recordAuditEvent({
                req,
                action: 'login_failed',
                actorRole: 'supplier',
                actorId: supplier.id,
                targetType: 'supplier',
                targetId: supplier.id,
                metadata: { identifier_hash: hashIdentifier(email.toLowerCase()) }
            });
            return res.status(HTTP.UNAUTHORIZED).json({ error: 'Invalid credentials' });
        }

        // Generate JWT tokens (with refresh rotation)
        const { accessToken, refreshToken } = await issueTokens({
            payload: {
                supplierId: supplier.id,
                email: supplier.email,
                name: supplier.name,
                role: 'supplier'
            },
            role: 'SUPPLIER',
            ip: req.ip,
            userAgent: req.get('user-agent')
        });

        setAuthCookies(res, refreshToken);

        void recordAuditEvent({
            req,
            action: 'login_success',
            actorRole: 'supplier',
            actorId: supplier.id,
            targetType: 'supplier',
            targetId: supplier.id
        });
        res.json(withOptionalRefreshToken({
            accessToken,
            supplier: {
                id: supplier.id,
                name: supplier.name,
                email: supplier.email,
                category: supplier.category,
                location: supplier.location
            }
        }, refreshToken));

    } catch (error) {
        logger.error('Supplier login error', error);
        res.status(HTTP.INTERNAL_SERVER_ERROR).json({ error: 'Internal server error' });
    }
});

module.exports = router;
