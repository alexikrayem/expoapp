const { query, param, body } = require('express-validator');
const validateRequest = require('../../middleware/validateRequest');
const express = require('express');
const router = express.Router();
const db = require('../../config/db');
const authSupplier = require('../../middleware/authSupplier');
const bcrypt = require('bcrypt');
const { invalidateCache, cacheResponse } = require('../../middleware/cache');
const {
    indexProductById,
    indexSupplierById,
    reindexProductsBySupplierId,
    reindexDealsBySupplierId
} = require('../../services/searchIndexer');
const { validatePassword } = require('../../services/passwordPolicy');
const { recordAuditEvent } = require('../../services/auditService');
const logger = require('../../services/logger');
const { revokeAllForSubject } = require('../../services/tokenService');
const { EFFECTIVE_PRICE_SQL } = require('../../utils/pricing');
const { parseBoolean } = require('../../utils/parseBoolean');
const { buildDynamicUpdate } = require('../../utils/dynamicUpdate');
const { triggerProductLinking } = require('../suppliers.helpers');
const {
    HTTP,
    VALIDATION_LIMITS,
    CACHE_TTL_SECONDS,
    validateSupplierCitiesUpdate,
    validateSupplierProductCreate,
    validateSupplierProductUpdate,
    validateSupplierProductIdParam,
    validateSupplierProductsList,
    validateSupplierBulkStockUpdate,
    validateDeliveryAgentCreate,
    validateDeliveryAgentUpdate,
    validateDeliveryAgentIdParam,
    validateSupplierOrdersList
} = require('./supplierUtils');

// Get supplier's delivery agents
router.get('/delivery-agents', authSupplier, async (req, res) => {
    try {
        const supplierId = req.supplier.supplierId;

        const query = `
            SELECT 
                id, full_name, phone_number, email, telegram_user_id, 
                is_active, created_at, updated_at
            FROM delivery_agents
            WHERE supplier_id = $1
            ORDER BY created_at DESC
            LIMIT 1000
        `;

        const result = await db.query(query, [supplierId]);
        res.json({ items: result.rows });

    } catch (error) {
        logger.error('Error fetching delivery agents', error);
        res.status(HTTP.INTERNAL_SERVER_ERROR).json({ error: 'Failed to fetch delivery agents' });
    }
});

// Create delivery agent
router.post('/delivery-agents', authSupplier, validateDeliveryAgentCreate, async (req, res) => {
    try {
        const supplierId = req.supplier.supplierId;
        const { full_name, phone_number, email, telegram_user_id, password, is_active = true } = req.body;

        const passwordErrors = validatePassword(password);
        if (passwordErrors.length > 0) {
            return res.status(HTTP.BAD_REQUEST).json({ error: 'Password does not meet requirements', details: passwordErrors });
        }

        // Check if phone number already exists
        const existingQuery = 'SELECT id FROM delivery_agents WHERE phone_number = $1';
        const existingResult = await db.query(existingQuery, [phone_number]);

        if (existingResult.rows.length > 0) {
            return res.status(HTTP.CONFLICT).json({ error: 'Phone number already exists' });
        }

        // Hash password
        const saltRounds = Number(process.env.BCRYPT_SALT_ROUNDS || 12);
        const passwordHash = await bcrypt.hash(password, saltRounds);

        const insertQuery = `
            INSERT INTO delivery_agents (
                supplier_id, full_name, phone_number, email, 
                telegram_user_id, password_hash, is_active
            ) VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING id, full_name, phone_number, email, telegram_user_id, is_active, created_at
        `;

        const result = await db.query(insertQuery, [
            supplierId, full_name, phone_number, email || null,
            telegram_user_id || null, passwordHash, parseBoolean(is_active, true)
        ]);

        void recordAuditEvent({
            req,
            action: 'delivery_agent_create',
            actorRole: 'supplier',
            actorId: supplierId,
            targetType: 'delivery_agent',
            targetId: result.rows[0]?.id,
            metadata: { phone_number }
        });
        res.status(HTTP.CREATED).json(result.rows[0]);

    } catch (error) {
        logger.error('Error creating delivery agent', error);
        res.status(HTTP.INTERNAL_SERVER_ERROR).json({ error: 'Failed to create delivery agent' });
    }
});

// Update delivery agent
router.put('/delivery-agents/:id', authSupplier, validateDeliveryAgentUpdate, async (req, res) => {
    try {
        const { id } = req.params;
        const supplierId = req.supplier.supplierId;
        const { full_name, phone_number, email, telegram_user_id, is_active } = req.body;

        // Verify agent belongs to this supplier
        const verifyQuery = 'SELECT id FROM delivery_agents WHERE id = $1 AND supplier_id = $2';
        const verifyResult = await db.query(verifyQuery, [id, supplierId]);

        if (verifyResult.rows.length === 0) {
            return res.status(HTTP.NOT_FOUND).json({ error: 'Delivery agent not found or not owned by you' });
        }

        const { updateFields, updateValues, updatedFieldNames, nextParamIndex } = buildDynamicUpdate({
            payload: req.body,
            fieldMap: {
                full_name: {},
                phone_number: {},
                email: { transform: (value) => value || null },
                telegram_user_id: { transform: (value) => value || null },
                is_active: { transform: (value) => parseBoolean(value) },
            },
        });

        if (updateFields.length === 0) {
            return res.status(HTTP.BAD_REQUEST).json({ error: 'No fields to update' });
        }

        updateFields.push(`updated_at = NOW()`);
        updateValues.push(id);

        const updateQuery = `
            UPDATE delivery_agents 
            SET ${updateFields.join(', ')}
            WHERE id = $${nextParamIndex}
            RETURNING id, full_name, phone_number, email, telegram_user_id, is_active, updated_at
        `;

        const result = await db.query(updateQuery, updateValues);
        if (result.rows[0]?.is_active === false) {
            await revokeAllForSubject(Number(id), 'delivery_agent');
        }
        void recordAuditEvent({
            req,
            action: 'delivery_agent_update',
            actorRole: 'supplier',
            actorId: supplierId,
            targetType: 'delivery_agent',
            targetId: Number(id),
            metadata: { updated_fields: updatedFieldNames }
        });
        res.json(result.rows[0]);

    } catch (error) {
        logger.error('Error updating delivery agent', error);
        res.status(HTTP.INTERNAL_SERVER_ERROR).json({ error: 'Failed to update delivery agent' });
    }
});

// Delete delivery agent
router.delete('/delivery-agents/:id', authSupplier, validateDeliveryAgentIdParam, async (req, res) => {
    try {
        const { id } = req.params;
        const supplierId = req.supplier.supplierId;

        // Verify agent belongs to this supplier
        const verifyQuery = 'SELECT id FROM delivery_agents WHERE id = $1 AND supplier_id = $2';
        const verifyResult = await db.query(verifyQuery, [id, supplierId]);

        if (verifyResult.rows.length === 0) {
            return res.status(HTTP.NOT_FOUND).json({ error: 'Delivery agent not found or not owned by you' });
        }

        // Check if agent has active deliveries
        const activeDeliveriesQuery = `
            SELECT COUNT(*) as active_count
            FROM order_items
            WHERE assigned_delivery_agent_id = $1 
            AND delivery_item_status IN ('assigned_to_agent', 'out_for_delivery')
        `;

        const activeResult = await db.query(activeDeliveriesQuery, [id]);

        if (parseInt(activeResult.rows[0].active_count) > 0) {
            return res.status(HTTP.BAD_REQUEST).json({
                error: 'Cannot delete agent with active deliveries. Deactivate instead.'
            });
        }

        const deleteQuery = 'DELETE FROM delivery_agents WHERE id = $1';
        await db.query(deleteQuery, [id]);

        await revokeAllForSubject(Number(id), 'delivery_agent');

        void recordAuditEvent({
            req,
            action: 'delivery_agent_delete',
            actorRole: 'supplier',
            actorId: supplierId,
            targetType: 'delivery_agent',
            targetId: Number(id)
        });
        res.json({ message: 'Delivery agent deleted successfully' });

    } catch (error) {
        logger.error('Error deleting delivery agent', error);
        res.status(HTTP.INTERNAL_SERVER_ERROR).json({ error: 'Failed to delete delivery agent' });
    }
});

// Toggle delivery agent active status
router.put('/delivery-agents/:id/toggle-active', authSupplier, validateDeliveryAgentIdParam, async (req, res) => {
    try {
        const { id } = req.params;
        const supplierId = req.supplier.supplierId;

        // Verify agent belongs to this supplier
        const verifyQuery = 'SELECT id, is_active FROM delivery_agents WHERE id = $1 AND supplier_id = $2';
        const verifyResult = await db.query(verifyQuery, [id, supplierId]);

        if (verifyResult.rows.length === 0) {
            return res.status(HTTP.NOT_FOUND).json({ error: 'Delivery agent not found or not owned by you' });
        }

        const updateQuery = `
            UPDATE delivery_agents 
            SET is_active = NOT is_active, updated_at = NOW()
            WHERE id = $1
            RETURNING id, full_name, phone_number, email, telegram_user_id, is_active, updated_at
        `;

        const result = await db.query(updateQuery, [id]);
        if (result.rows[0]?.is_active === false) {
            await revokeAllForSubject(Number(id), 'delivery_agent');
        }
        void recordAuditEvent({
            req,
            action: 'delivery_agent_toggle_active',
            actorRole: 'supplier',
            actorId: supplierId,
            targetType: 'delivery_agent',
            targetId: Number(id),
            metadata: { is_active: result.rows[0]?.is_active }
        });
        res.json(result.rows[0]);

    } catch (error) {
        logger.error('Error toggling delivery agent status', error);
        res.status(HTTP.INTERNAL_SERVER_ERROR).json({ error: 'Failed to toggle agent status' });
    }
});


module.exports = router;
