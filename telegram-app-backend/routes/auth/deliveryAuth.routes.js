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

// Delivery Agent Login
router.post('/delivery/login', loginLimiter, [
    body('phoneNumber').notEmpty().withMessage('Phone number is required'),
    body('password').notEmpty().withMessage('Password is required'),
    validateRequest
], async (req, res) => {
    try {
        const { phoneNumber, password } = req.body;

        // Find delivery agent by phone
        const agentQuery = `
            SELECT id, supplier_id, full_name, phone_number, password_hash, is_active
            FROM delivery_agents
            WHERE phone_number = $1 AND is_active = true
        `;
        const agentResult = await db.query(agentQuery, [phoneNumber]);

        if (agentResult.rows.length === 0) {
            // Still hash the password to prevent timing attacks
            await bcrypt.compare(password, '$2b$10$NQ4q9yO6jRZ5pZ4q9yO6jRZ5pZ4q9yO6jRZ5pZ4q9yO6jRZ5pZ4q9y'); // dummy hash
            void recordAuditEvent({
                req,
                action: 'login_failed',
                actorRole: 'delivery_agent',
                actorId: null,
                targetType: 'delivery_agent',
                targetId: null,
                metadata: { identifier_hash: hashIdentifier(phoneNumber) }
            });
            return res.status(HTTP.UNAUTHORIZED).json({ error: 'Invalid credentials' });
        }

        const agent = agentResult.rows[0];

        // Check password
        const isValidPassword = await bcrypt.compare(password, agent.password_hash);
        if (!isValidPassword) {
            void recordAuditEvent({
                req,
                action: 'login_failed',
                actorRole: 'delivery_agent',
                actorId: agent.id,
                targetType: 'delivery_agent',
                targetId: agent.id,
                metadata: { identifier_hash: hashIdentifier(phoneNumber) }
            });
            return res.status(HTTP.UNAUTHORIZED).json({ error: 'Invalid credentials' });
        }

        // Generate JWT tokens
        const { accessToken, refreshToken } = await issueTokens({
            payload: {
                deliveryAgentId: agent.id,
                supplierId: agent.supplier_id,
                name: agent.full_name,
                role: 'delivery_agent'
            },
            role: 'DELIVERY',
            ip: req.ip,
            userAgent: req.get('user-agent')
        });

        setAuthCookies(res, refreshToken);

        void recordAuditEvent({
            req,
            action: 'login_success',
            actorRole: 'delivery_agent',
            actorId: agent.id,
            targetType: 'delivery_agent',
            targetId: agent.id
        });
        res.json(withOptionalRefreshToken({
            accessToken,
            agent: {
                id: agent.id,
                name: agent.full_name,
                phone: agent.phone_number,
                supplierId: agent.supplier_id
            }
        }, refreshToken));

    } catch (error) {
        logger.error('Delivery agent login error', error);
        res.status(HTTP.INTERNAL_SERVER_ERROR).json({ error: 'Internal server error' });
    }
});

module.exports = router;
