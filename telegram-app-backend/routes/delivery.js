// routes/delivery.js
const express = require('express');
const router = express.Router();
const db = require('../config/db');
const authDeliveryAgent = require('../middleware/authDeliveryAgent');
const { body, param, query } = require('express-validator');
const validateRequest = require('../middleware/validateRequest');

router.use(authDeliveryAgent);

const { ALLOWED_DELIVERY_STATUSES, isValidTransition } = require('../utils/deliveryStateMachine');
const DEFAULT_STATUS_FILTER = ['assigned_to_agent', 'out_for_delivery'];

const validateAssignedItems = [
    query('page').optional().isInt({ min: 1, max: 1000 }).withMessage('Page must be between 1 and 1000'),
    query('statuses').optional().isString(),
    validateRequest
];

const validateStatusUpdate = [
    param('orderItemId').isInt({ min: 1 }).withMessage('Order item ID must be a positive integer'),
    body('newStatus').isIn([...ALLOWED_DELIVERY_STATUSES]).withMessage('Invalid delivery status'),
    body('notes').optional({ nullable: true }).isString().isLength({ max: 1000 }).withMessage('Notes must be at most 1000 characters'),
    body('paymentCollected').optional().isBoolean().withMessage('paymentCollected must be a boolean'),
    validateRequest
];

// Get assigned order items for delivery agent
router.get('/assigned-items', validateAssignedItems, async (req, res) => {
    try {
        const { page = 1, statuses = 'assigned_to_agent,out_for_delivery' } = req.query;
        const deliveryAgentId = req.deliveryAgent.deliveryAgentId;
        const limit = 20;
        const pageNum = Number.parseInt(page, 10) || 1;
        const offset = Math.max(pageNum - 1, 0) * limit;

        const statusArray = String(statuses)
            .split(',')
            .map(s => s.trim())
            .filter(Boolean);
        const invalidStatuses = statusArray.filter(status => !ALLOWED_DELIVERY_STATUSES.has(status));
        if (invalidStatuses.length > 0) {
            return res.status(400).json({ error: `Invalid status filter(s): ${invalidStatuses.join(', ')}` });
        }
        const effectiveStatuses = statusArray.length > 0 ? statusArray : DEFAULT_STATUS_FILTER;

        const query = `
            SELECT 
                oi.id as order_item_id,
                oi.order_id,
                oi.product_id,
                oi.quantity,
                oi.price_at_time_of_order,
                oi.delivery_item_status,
                p.name as product_name,
                p.image_url as product_image_url,
                o.order_date,
                up.full_name as customer_name,
                up.phone_number as customer_phone,
                up.address_line1 as customer_address1,
                up.address_line2 as customer_address2,
                up.city as customer_city,
                o.status as overall_order_delivery_status
            FROM order_items oi
            JOIN orders o ON oi.order_id = o.id
            JOIN products p ON oi.product_id = p.id
            LEFT JOIN user_profiles up ON o.user_id = up.user_id
            WHERE oi.assigned_delivery_agent_id = $1
            AND oi.delivery_item_status = ANY($2::text[])
            ORDER BY o.order_date DESC
            LIMIT $3 OFFSET $4
        `;

        const result = await db.query(query, [deliveryAgentId, effectiveStatuses, limit, offset]);

        // Get total count for pagination
        const countQuery = `
            SELECT COUNT(*) as total
            FROM order_items oi
            WHERE oi.assigned_delivery_agent_id = $1
            AND oi.delivery_item_status = ANY($2::text[])
        `;

        const countResult = await db.query(countQuery, [deliveryAgentId, effectiveStatuses]);
        const totalItems = parseInt(countResult.rows[0].total);

        res.json({
            items: result.rows,
            currentPage: pageNum,
            totalPages: Math.ceil(totalItems / limit),
            totalItems,
            limit
        });

    } catch (error) {
        const logger = require('../services/logger');
        logger.error('Error fetching assigned items', error);
        res.status(500).json({ error: 'Failed to fetch assigned items' });
    }
});

// Update order item status
router.put('/order-items/:orderItemId/status', validateStatusUpdate, async (req, res) => {
    try {
        const { orderItemId } = req.params;
        const { newStatus, notes, paymentCollected } = req.body;
        const deliveryAgentId = req.deliveryAgent.deliveryAgentId;

        const client = await db.pool.connect();

        try {
            await client.query('BEGIN');

            // Verify the item is assigned to this agent and lock the row
            const verifyQuery = `
                SELECT * FROM order_items 
                WHERE id = $1 AND assigned_delivery_agent_id = $2
                FOR UPDATE
            `;

            const verifyResult = await client.query(verifyQuery, [orderItemId, deliveryAgentId]);

            if (verifyResult.rows.length === 0) {
                await client.query('ROLLBACK');
                return res.status(404).json({ error: 'Order item not found or not assigned to you' });
            }

            const currentItem = verifyResult.rows[0];
            const currentStatus = currentItem.delivery_item_status;

            if (!isValidTransition(currentStatus, newStatus)) {
                await client.query('ROLLBACK');
                return res.status(400).json({ error: `Cannot transition status from ${currentStatus} to ${newStatus}` });
            }

            // Update the status
            const updateQuery = `
                UPDATE order_items 
                SET 
                    delivery_item_status = $1,
                    delivery_notes = $2,
                    item_payment_collected = $3,
                    item_delivered_at = CASE WHEN $1 = 'delivered' THEN NOW() ELSE item_delivered_at END
                WHERE id = $4
                RETURNING *
            `;

            const result = await client.query(updateQuery, [
                newStatus,
                notes || null,
                Boolean(paymentCollected),
                orderItemId
            ]);

            await client.query('COMMIT');
            res.json(result.rows[0]);

        } catch (dbError) {
            await client.query('ROLLBACK');
            throw dbError;
        } finally {
            client.release();
        }

    } catch (error) {
        const logger = require('../services/logger');
        logger.error('Error updating order item status', error);
        res.status(500).json({ error: 'Failed to update order item status' });
    }
});

module.exports = router;
