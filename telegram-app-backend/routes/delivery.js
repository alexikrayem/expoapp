// routes/delivery.js
const express = require('express');
const router = express.Router();
const db = require('../config/db');
const authDeliveryAgent = require('../middleware/authDeliveryAgent');

// Get assigned order items for delivery agent
router.get('/assigned-items', authDeliveryAgent, async (req, res) => {
    try {
        const { page = 1, statuses = 'assigned_to_agent,out_for_delivery' } = req.query;
        const deliveryAgentId = req.deliveryAgent.deliveryAgentId;
        const limit = 20;
        const offset = (parseInt(page) - 1) * limit;
        
        const statusArray = statuses.split(',').map(s => s.trim());
        const statusPlaceholders = statusArray.map((_, index) => `$${index + 2}`).join(',');
        
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
                o.customer_name,
                o.customer_phone,
                o.customer_address1,
                o.customer_address2,
                o.customer_city,
                o.status as overall_order_delivery_status
            FROM order_items oi
            JOIN orders o ON oi.order_id = o.id
            JOIN products p ON oi.product_id = p.id
            WHERE oi.assigned_delivery_agent_id = $1
            AND oi.delivery_item_status = ANY($${statusArray.length + 1}::text[])
            ORDER BY o.order_date DESC
            LIMIT ${limit} OFFSET ${offset}
        `;
        
        const result = await db.query(query, [deliveryAgentId, statusArray]);
        
        // Get total count for pagination
        const countQuery = `
            SELECT COUNT(*) as total
            FROM order_items oi
            WHERE oi.assigned_delivery_agent_id = $1
            AND oi.delivery_item_status = ANY($2::text[])
        `;
        
        const countResult = await db.query(countQuery, [deliveryAgentId, statusArray]);
        const totalItems = parseInt(countResult.rows[0].total);
        
        res.json({
            items: result.rows,
            currentPage: parseInt(page),
            totalPages: Math.ceil(totalItems / limit),
            totalItems,
            limit
        });
        
    } catch (error) {
        console.error('Error fetching assigned items:', error);
        res.status(500).json({ error: 'Failed to fetch assigned items' });
    }
});

// Update order item status
router.put('/order-items/:orderItemId/status', authDeliveryAgent, async (req, res) => {
    try {
        const { orderItemId } = req.params;
        const { newStatus, notes, paymentCollected } = req.body;
        const deliveryAgentId = req.deliveryAgent.deliveryAgentId;
        
        // Verify the item is assigned to this agent
        const verifyQuery = `
            SELECT * FROM order_items 
            WHERE id = $1 AND assigned_delivery_agent_id = $2
        `;
        
        const verifyResult = await db.query(verifyQuery, [orderItemId, deliveryAgentId]);
        
        if (verifyResult.rows.length === 0) {
            return res.status(404).json({ error: 'Order item not found or not assigned to you' });
        }
        
        // Update the status
        const updateQuery = `
            UPDATE order_items 
            SET 
                delivery_item_status = $1,
                delivery_notes = $2,
                payment_collected = $3,
                updated_at = NOW()
            WHERE id = $4
            RETURNING *
        `;
        
        const result = await db.query(updateQuery, [
            newStatus,
            notes || null,
            paymentCollected || false,
            orderItemId
        ]);
        
        res.json(result.rows[0]);
        
    } catch (error) {
        console.error('Error updating order item status:', error);
        res.status(500).json({ error: 'Failed to update order item status' });
    }
});

module.exports = router;