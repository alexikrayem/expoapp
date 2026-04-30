const { query, param, body } = require('express-validator');
const validateRequest = require('../../middleware/validateRequest');
const express = require('express');
const router = express.Router();
const db = require('../../config/db');
const logger = require('../../services/logger');
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
const { revokeAllForSubject } = require('../../services/tokenService');
const { EFFECTIVE_PRICE_SQL } = require('../../utils/pricing');
const { parseBoolean } = require('../../utils/parseBoolean');
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

// Get supplier stats
router.get('/stats', authSupplier, async (req, res) => {
    try {
        const supplierId = req.supplier.supplierId;
        
        const statsQuery = `
            SELECT 
                COUNT(DISTINCT p.id) as total_products,
                COUNT(DISTINCT CASE WHEN p.stock_level > 0 THEN p.id END) as in_stock_products,
                COUNT(DISTINCT CASE WHEN p.stock_level = 0 THEN p.id END) as out_of_stock_products,
                COUNT(DISTINCT CASE WHEN p.is_on_sale = true THEN p.id END) as on_sale_products,
                COUNT(DISTINCT CASE WHEN o.order_date >= CURRENT_DATE - INTERVAL '30 days' THEN o.id END) as orders_this_month,
                COALESCE(SUM(CASE WHEN o.order_date >= CURRENT_DATE - INTERVAL '30 days' THEN oi.quantity * oi.price_at_time_of_order END), 0) as sales_this_month
            FROM products p
            LEFT JOIN order_items oi ON p.id = oi.product_id
            LEFT JOIN orders o ON oi.order_id = o.id AND o.status NOT IN ('cancelled')
            WHERE p.supplier_id = $1
        `;
        
        const result = await db.query(statsQuery, [supplierId]);
        const stats = result.rows[0];
        
        // Convert string numbers to integers/floats
        Object.keys(stats).forEach(key => {
            if (key.includes('count') || key.includes('products') || key.includes('orders')) {
                stats[key] = parseInt(stats[key]) || 0;
            } else if (key.includes('sales')) {
                stats[key] = parseFloat(stats[key]) || 0;
            }
        });
        
        res.json(stats);
        
    } catch (error) {
        logger.error('Error fetching supplier stats', error);
        res.status(HTTP.INTERNAL_SERVER_ERROR).json({ error: 'Failed to fetch stats' });
    }
});

// Get supplier's orders with items
router.get('/orders', authSupplier, validateSupplierOrdersList, async (req, res) => {
    try {
        const supplierId = req.supplier.supplierId;
        const { page = 1, limit = 20, status } = req.query;
        const offset = (parseInt(page) - 1) * parseInt(limit);
        
        let whereClause = 'WHERE p.supplier_id = $1';
        const queryParams = [supplierId];
        let paramIndex = 2;
        
        if (status && status !== 'all') {
            whereClause += ` AND o.status = $${paramIndex}`;
            queryParams.push(status);
            paramIndex++;
        }
        
        const query = `
            SELECT 
                o.id as order_id,
                o.user_id,
                o.total_amount,
                o.order_date,
                o.status as order_status,
                o.delivery_status,
                up.full_name as customer_name,
                up.phone_number as customer_phone,
                up.address_line1 as customer_address1,
                up.address_line2 as customer_address2,
                up.city as customer_city,
                json_agg(
                    json_build_object(
                        'order_item_id', oi.id,
                        'product_id', oi.product_id,
                        'product_name', p.name,
                        'product_image_url', p.image_url,
                        'quantity', oi.quantity,
                        'price_at_time_of_order', oi.price_at_time_of_order,
                        'supplier_item_status', oi.supplier_item_status,
                        'delivery_item_status', oi.delivery_item_status
                    )
                ) as items_for_this_supplier,
                SUM(oi.quantity * oi.price_at_time_of_order) as supplier_order_value,
                COUNT(*) OVER() as total_count
            FROM orders o
            JOIN order_items oi ON o.id = oi.order_id
            JOIN products p ON oi.product_id = p.id
            LEFT JOIN user_profiles up ON o.user_id = up.user_id
            ${whereClause}
            GROUP BY o.id, o.user_id, o.total_amount, o.order_date, o.status, o.delivery_status,
                     up.full_name, up.phone_number, up.address_line1, up.address_line2, up.city
            ORDER BY o.order_date DESC
            LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
        `;
        
        queryParams.push(parseInt(limit), offset);
        
        const result = await db.query(query, queryParams);
        const totalItems = result.rows.length > 0 ? parseInt(result.rows[0].total_count) : 0;
        
        res.json({
            items: result.rows,
            currentPage: parseInt(page),
            totalPages: totalItems === 0 ? 0 : Math.ceil(totalItems / parseInt(limit)),
            totalItems
        });
        
    } catch (error) {
        logger.error('Error fetching supplier orders', error);
        res.status(HTTP.INTERNAL_SERVER_ERROR).json({ error: 'Failed to fetch orders' });
    }
});


module.exports = router;