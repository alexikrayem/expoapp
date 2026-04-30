// routes/orders.js (FINAL CORRECTED VERSION)
const express = require('express');
const { body, param, validationResult } = require('express-validator');
const router = express.Router();
const db = require('../config/db');
const telegramBotService = require('../services/telegramBot');
const { enqueueOrderNotification } = require('../services/notificationQueue');
const logger = require('../services/logger');
const {
    enqueuePendingOrderNotifications,
    dispatchPendingNotificationsForOrder
} = require('../services/orderNotificationOutbox');
const { idempotency } = require('../middleware/idempotency');
const { orderCreateLimiter } = require('../middleware/rateLimiters');
const requireCustomer = require('../middleware/requireCustomer');
const { EFFECTIVE_PRICE_SQL } = require('../utils/pricing');

const HTTP = Object.freeze({
    CREATED: Number.parseInt('201', 10),
    BAD_REQUEST: Number.parseInt('400', 10),
    NOT_FOUND: Number.parseInt('404', 10),
    CONFLICT: Number.parseInt('409', 10),
    INTERNAL_SERVER_ERROR: Number.parseInt('500', 10)
});

const VALIDATION_LIMITS = Object.freeze({
    MAX_PRODUCT_ID: Number.parseInt('999999', 10),
    MAX_QUANTITY: Number.parseInt('999', 10),
    MAX_ITEM_PRICE: Number.parseInt('999999', 10),
    MAX_TOTAL_AMOUNT: Number.parseInt('9999999', 10),
    MAX_ORDER_ID: Number.parseInt('9999999', 10)
});

const idempotencyCreateOrder = idempotency({ scope: 'orders:create', requireKey: true });
const idempotencyCreateFromCart = idempotency({ scope: 'orders:create-from-cart', requireKey: true });

router.use(requireCustomer);

// Validation middleware for order operations
const validateCreateOrder = [
    body('items').isArray({ min: 1, max: 50 }).withMessage('Items must be a non-empty array with max 50 items'),
    body('items.*.product_id').isInt({ min: 1, max: VALIDATION_LIMITS.MAX_PRODUCT_ID }).withMessage('Each product ID must be a positive integer'),
    body('items.*.quantity').isInt({ min: 1, max: VALIDATION_LIMITS.MAX_QUANTITY }).withMessage(`Each quantity must be between 1 and ${VALIDATION_LIMITS.MAX_QUANTITY}`),
    body('items.*.price_at_time_of_order').optional().isFloat({ min: 0, max: VALIDATION_LIMITS.MAX_ITEM_PRICE }).withMessage('Price at time of order must be a positive number'),
    body('total_amount').optional().isFloat({ min: 0, max: VALIDATION_LIMITS.MAX_TOTAL_AMOUNT }).withMessage('Total amount must be a positive number')
];

const validateOrderStatusUpdate = [
    param('orderId').isInt({ min: 1, max: VALIDATION_LIMITS.MAX_ORDER_ID }).withMessage('Order ID must be a positive integer'),
    body('status').isIn(['cancelled']).withMessage('Only "cancelled" status is allowed for updates')
];

// POST /from-cart - Create a new order from frontend cart data
router.post('/from-cart', orderCreateLimiter, idempotencyCreateFromCart, validateCreateOrder, async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(HTTP.BAD_REQUEST).json({ error: 'Validation failed', details: errors.array() });
        }
        
        const { userId } = req.user;
        const { items } = req.body;
        
        if (!items || !Array.isArray(items) || items.length === 0) {
            return res.status(HTTP.BAD_REQUEST).json({ error: 'Cart items are required' });
        }

        const client = await db.pool.connect();

        try {
            await client.query('BEGIN');

            // Step 1: Verify all products exist and have sufficient stock (single query, row-locked)
            const requestedQuantityByProduct = new Map();
            for (const item of items) {
                const currentQty = requestedQuantityByProduct.get(item.product_id) || 0;
                requestedQuantityByProduct.set(item.product_id, currentQty + item.quantity);
            }

            const uniqueProductIds = Array.from(requestedQuantityByProduct.keys());
            const productsQuery = `
                SELECT p.id, p.name, p.stock_level, p.supplier_id,
                       ${EFFECTIVE_PRICE_SQL} as effective_price
                FROM products p
                LEFT JOIN master_products mp ON p.master_product_id = mp.id
                WHERE p.id = ANY($1::int[])
                FOR UPDATE OF p
            `;
            const productsResult = await client.query(productsQuery, [uniqueProductIds]);

            if (productsResult.rows.length !== uniqueProductIds.length) {
                const foundIds = new Set(productsResult.rows.map((row) => row.id));
                const missingIds = uniqueProductIds.filter((id) => !foundIds.has(id));
                await client.query('ROLLBACK');
                return res.status(HTTP.BAD_REQUEST).json({ error: `Product(s) not found: ${missingIds.join(', ')}` });
            }

            const productMap = new Map(productsResult.rows.map((row) => [row.id, row]));
            for (const [productId, totalQuantity] of requestedQuantityByProduct.entries()) {
                const product = productMap.get(productId);
                if (!product) {
                    await client.query('ROLLBACK');
                    return res.status(HTTP.BAD_REQUEST).json({ error: `Product with ID ${productId} not found` });
                }
                if (product.stock_level < totalQuantity) {
                    await client.query('ROLLBACK');
                    return res.status(HTTP.CONFLICT).json({ error: `Insufficient stock for product: ${product.name}` });
                }
            }
            
            // Step 2: Get user's profile for validation
            const userResult = await client.query(
                'SELECT full_name, phone_number, address_line1, address_line2, city FROM user_profiles WHERE user_id = $1',
                [userId]
            );
            const customer = userResult.rows[0];
            if (!customer || !customer.address_line1) {
                await client.query('ROLLBACK');
                return res.status(HTTP.BAD_REQUEST).json({ error: 'User profile or address is incomplete.' });
            }

            // Step 3: Compute prices server-side (ignore client totals/prices)
            const effectivePriceByProduct = new Map();
            const productNameById = new Map();
            for (const row of productsResult.rows) {
                const price = Number(row.effective_price);
                effectivePriceByProduct.set(row.id, Number.isFinite(price) ? price : null);
                productNameById.set(row.id, row.name);
            }

            const itemProductIds = Array.from(requestedQuantityByProduct.keys());
            const itemQuantities = itemProductIds.map((id) => requestedQuantityByProduct.get(id));
            const itemPrices = itemProductIds.map((id) => effectivePriceByProduct.get(id));

            if (itemPrices.some((price) => !Number.isFinite(price))) {
                await client.query('ROLLBACK');
                return res.status(HTTP.BAD_REQUEST).json({ error: 'Unable to compute product pricing.' });
            }

            const totalAmountRaw = itemProductIds.reduce((sum, id, index) => {
                const price = itemPrices[index] || 0;
                return sum + price * itemQuantities[index];
            }, 0);
            const totalAmount = Number(totalAmountRaw.toFixed(2));

            // Step 4: Create the main order record
            const orderQuery = `
                INSERT INTO orders (user_id, total_amount, order_date, status, delivery_status)
                VALUES ($1, $2, NOW(), 'pending', 'pending_pickup')
                RETURNING id
            `;
            const orderResult = await client.query(orderQuery, [userId, totalAmount]);
            const orderId = orderResult.rows[0].id;

            // Step 5: Create order_items records and update product stock
            const orderItemsQuery = `
                INSERT INTO order_items (order_id, product_id, quantity, price_at_time_of_order)
                SELECT $1, unnest($2::int[]), unnest($3::int[]), unnest($4::numeric[])
            `;
            await client.query(orderItemsQuery, [orderId, itemProductIds, itemQuantities, itemPrices]);

            const stockProductIds = Array.from(requestedQuantityByProduct.keys());
            const stockQuantities = stockProductIds.map((productId) => requestedQuantityByProduct.get(productId));
            const updateStockQuery = `
                UPDATE products p
                SET stock_level = p.stock_level - u.qty
                FROM (
                    SELECT unnest($1::int[]) AS id, unnest($2::int[]) AS qty
                ) AS u
                WHERE p.id = u.id
            `;
            await client.query(updateStockQuery, [stockProductIds, stockQuantities]);

            const supplierNotifications = new Map();

            itemProductIds.forEach((productId, index) => {
                const product = productMap.get(productId);
                if (!product) return;

                const supplierId = Number(product.supplier_id);
                if (!Number.isInteger(supplierId) || supplierId <= 0) return;

                const unitPrice = Number(itemPrices[index]) || 0;
                const qty = itemQuantities[index] || 0;
                const current = supplierNotifications.get(supplierId) || { items: [], totalAmount: 0 };

                current.items.push({
                    product_name: productNameById.get(productId) || 'Unknown Product',
                    quantity: qty,
                    price_at_time_of_order: unitPrice
                });
                current.totalAmount += unitPrice * qty;
                supplierNotifications.set(supplierId, current);
            });

            const pendingNotifications = [];
            for (const [supplierId, notification] of supplierNotifications.entries()) {
                const supplierTotal = Number(notification.totalAmount.toFixed(2));
                pendingNotifications.push({
                    orderId,
                    supplierId,
                    total_amount: supplierTotal,
                    order_total_amount: totalAmount,
                    items: notification.items,
                    customerInfo: {
                        name: customer?.full_name || 'غير محدد',
                        phone: customer?.phone_number || 'غير محدد',
                        address1: customer?.address_line1 || 'غير محدد',
                        address2: customer?.address_line2,
                        city: customer?.city || 'غير محدد'
                    },
                    orderDate: new Date().toISOString()
                });
            }

            let useDirectFallbackDispatch = false;
            if (pendingNotifications.length > 0) {
                const insertedCount = await enqueuePendingOrderNotifications(client, pendingNotifications);
                useDirectFallbackDispatch = insertedCount === 0;
            }

            await client.query('COMMIT');

            try {
                if (useDirectFallbackDispatch) {
                    for (const notificationPayload of pendingNotifications) {
                        const queued = await enqueueOrderNotification(notificationPayload);
                        if (!queued) {
                            await telegramBotService.sendOrderNotificationToDeliveryAgent(notificationPayload);
                        }
                    }
                } else {
                    await dispatchPendingNotificationsForOrder(orderId);
                }
            } catch (notificationError) {
                logger.error('Failed to dispatch pending order notification', notificationError, {
                    orderId,
                    fallbackDispatch: useDirectFallbackDispatch
                });
            }
            
            res.status(HTTP.CREATED).json({ orderId, message: 'Order created successfully' });

        } catch (error) {
            await client.query('ROLLBACK');
            logger.error('Error creating order from cart', error);
            res.status(HTTP.INTERNAL_SERVER_ERROR).json({ error: 'Failed to create order due to a server error.' });
        } finally {
            client.release();
        }
    } catch (error) {
        res.status(HTTP.INTERNAL_SERVER_ERROR).json({ error: 'Internal server error during order creation' });
    }
});

// POST / - Create a new order for the authenticated user
router.post('/', orderCreateLimiter, idempotencyCreateOrder, async (req, res) => {
    try {
        const { userId } = req.user;
        const client = await db.pool.connect();

        try {
            await client.query('BEGIN');

            // Step 1: Get user's cart items from the correct table 'cart_items'
            // FIX: Ensure supplier is active
            const cartQuery = `
                SELECT 
                    c.product_id, c.quantity, p.name as product_name, p.supplier_id, p.stock_level,
                    ${EFFECTIVE_PRICE_SQL} as effective_price
                FROM cart_items c -- FIX: Corrected table name
                JOIN products p ON c.product_id = p.id
                JOIN suppliers s ON p.supplier_id = s.id
                LEFT JOIN master_products mp ON p.master_product_id = mp.id
                WHERE c.user_id = $1 AND p.stock_level > 0 AND s.is_active = true FOR UPDATE
            `;
            const cartResult = await client.query(cartQuery, [userId]);
            
            if (cartResult.rows.length === 0) {
                await client.query('ROLLBACK');
                return res.status(HTTP.BAD_REQUEST).json({ error: 'Cart is empty. Cannot create order.' });
            }

            // Step 2: Verify stock levels
            for (const item of cartResult.rows) {
                if (item.quantity > item.stock_level) {
                    await client.query('ROLLBACK');
                    return res.status(HTTP.CONFLICT).json({ error: `Insufficient stock for product: ${item.product_name}.` });
                }
            }
            
            // Step 3: Get user's profile for details
            const userResult = await client.query(
                'SELECT full_name, phone_number, address_line1, address_line2, city FROM user_profiles WHERE user_id = $1',
                [userId]
            );
            const customer = userResult.rows[0];
            if (!customer || !customer.address_line1) {
                await client.query('ROLLBACK');
                return res.status(HTTP.BAD_REQUEST).json({ error: 'User profile or address is incomplete.' });
            }

            // Step 4: Calculate total amount
            const totalAmountRaw = cartResult.rows.reduce((sum, item) => sum + (Number(item.effective_price) * item.quantity), 0);
            const totalAmount = Number(totalAmountRaw.toFixed(2));

            // Step 5: Create the main order record with the CORRECT columns
            const orderQuery = `
                INSERT INTO orders (user_id, total_amount, order_date, status, delivery_status)
                VALUES ($1, $2, NOW(), 'pending', 'pending_pickup')
                RETURNING id
            `;
            const orderResult = await client.query(orderQuery, [userId, totalAmount]);
            const orderId = orderResult.rows[0].id;

            // Step 6: Create order_items records and update product stock
            const itemProductIds = cartResult.rows.map((item) => item.product_id);
            const itemQuantities = cartResult.rows.map((item) => item.quantity);
            const itemPrices = cartResult.rows.map((item) => Number(item.effective_price));

            if (itemProductIds.length > 0) {
                const orderItemsQuery = `
                    INSERT INTO order_items (order_id, product_id, quantity, price_at_time_of_order)
                    SELECT $1, unnest($2::int[]), unnest($3::int[]), unnest($4::numeric[])
                `;
                await client.query(orderItemsQuery, [orderId, itemProductIds, itemQuantities, itemPrices]);

                const updateStockQuery = `
                    UPDATE products p
                    SET stock_level = p.stock_level - u.qty
                    FROM (
                        SELECT unnest($1::int[]) AS id, unnest($2::int[]) AS qty
                    ) AS u
                    WHERE p.id = u.id
                `;
                await client.query(updateStockQuery, [itemProductIds, itemQuantities]);
            }

            // Step 7: Clear the user's cart from the correct table
            await client.query('DELETE FROM cart_items WHERE user_id = $1', [userId]);

            const supplierNotifications = new Map();

            cartResult.rows.forEach((item) => {
                const supplierId = Number(item.supplier_id);
                if (!Number.isInteger(supplierId) || supplierId <= 0) return;

                const unitPrice = Number(item.effective_price) || 0;
                const current = supplierNotifications.get(supplierId) || { items: [], totalAmount: 0 };

                current.items.push({
                    product_name: item.product_name || 'Unknown Product',
                    quantity: item.quantity,
                    price_at_time_of_order: unitPrice
                });
                current.totalAmount += unitPrice * item.quantity;
                supplierNotifications.set(supplierId, current);
            });

            const pendingNotifications = [];
            for (const [supplierId, notification] of supplierNotifications.entries()) {
                const supplierTotal = Number(notification.totalAmount.toFixed(2));
                pendingNotifications.push({
                    orderId,
                    supplierId,
                    total_amount: supplierTotal,
                    order_total_amount: totalAmount,
                    items: notification.items,
                    customerInfo: {
                        name: customer?.full_name || 'غير محدد',
                        phone: customer?.phone_number || 'غير محدد',
                        address1: customer?.address_line1 || 'غير محدد',
                        address2: customer?.address_line2,
                        city: customer?.city || 'غير محدد'
                    },
                    orderDate: new Date().toISOString()
                });
            }

            let useDirectFallbackDispatch = false;
            if (pendingNotifications.length > 0) {
                const insertedCount = await enqueuePendingOrderNotifications(client, pendingNotifications);
                useDirectFallbackDispatch = insertedCount === 0;
            }

            await client.query('COMMIT');

            try {
                if (useDirectFallbackDispatch) {
                    for (const notificationPayload of pendingNotifications) {
                        const queued = await enqueueOrderNotification(notificationPayload);
                        if (!queued) {
                            await telegramBotService.sendOrderNotificationToDeliveryAgent(notificationPayload);
                        }
                    }
                } else {
                    await dispatchPendingNotificationsForOrder(orderId);
                }
            } catch (notificationError) {
                logger.error('Failed to dispatch pending order notification (cart order)', notificationError, {
                    orderId,
                    fallbackDispatch: useDirectFallbackDispatch
                });
            }

            res.status(HTTP.CREATED).json({ orderId, message: 'Order created successfully' });

        } catch (error) {
            await client.query('ROLLBACK');
            logger.error('Error creating order', error);
            res.status(HTTP.INTERNAL_SERVER_ERROR).json({ error: 'Failed to create order due to a server error.' });
        } finally {
            client.release();
        }
    } catch (error) {
        logger.error('Internal error creating order from cart', error);
        res.status(HTTP.INTERNAL_SERVER_ERROR).json({ error: 'Internal server error during order creation' });
    }
});

// GET / - Get all orders for the authenticated user (This route was already correct)
router.get('/', async (req, res) => {
    try {
        const { userId } = req.user;
        const ordersQuery = `
            SELECT o.*,
                   json_agg(json_build_object(
                       'product_id', oi.product_id, 'product_name', p.name,
                       'quantity', oi.quantity, 'price_at_time_of_order', oi.price_at_time_of_order
                   )) as items
            FROM orders o
            LEFT JOIN order_items oi ON o.id = oi.order_id
            LEFT JOIN products p ON oi.product_id = p.id
            WHERE o.user_id = $1
            GROUP BY o.id
            ORDER BY o.order_date DESC
        `;
        const result = await db.query(ordersQuery, [userId]);
        res.json(result.rows);
    } catch (error) {
        logger.error('Error fetching orders', error);
        res.status(HTTP.INTERNAL_SERVER_ERROR).json({ error: 'Failed to fetch orders' });
    }
});

// PUT /:orderId/status - Update the status of an order
router.put('/:orderId/status', validateOrderStatusUpdate, async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(HTTP.BAD_REQUEST).json({ error: 'Validation failed', details: errors.array() });
        }
        
        const { userId } = req.user;
        const { orderId } = req.params;
        const { status } = req.body;

        // Basic validation
        if (!status || !['cancelled'].includes(status)) { // Only allow cancelling for now
            return res.status(HTTP.BAD_REQUEST).json({ error: 'Invalid or unsupported status update.' });
        }

        const client = await db.pool.connect();
        try {
            await client.query('BEGIN');

            // Verify the user owns this order and it is in a cancelable state
            const verifyQuery = `
                SELECT * FROM orders 
                WHERE id = $1 AND user_id = $2 AND status = 'pending'
            `;
            const verifyResult = await client.query(verifyQuery, [orderId, userId]);

            if (verifyResult.rows.length === 0) {
                await client.query('ROLLBACK');
                return res.status(HTTP.NOT_FOUND).json({ error: 'Order not found or it cannot be cancelled.' });
            }

            // On cancellation, restore stock for all items in the order
            if (status === 'cancelled') {
                const itemsQuery = 'SELECT product_id, quantity FROM order_items WHERE order_id = $1';
                const itemsResult = await client.query(itemsQuery, [orderId]);
                if (itemsResult.rows.length > 0) {
                    const itemProductIds = itemsResult.rows.map((item) => item.product_id);
                    const itemQuantities = itemsResult.rows.map((item) => item.quantity);
                    const stockUpdateQuery = `
                        UPDATE products p
                        SET stock_level = p.stock_level + u.qty
                        FROM (
                            SELECT unnest($1::int[]) AS id, unnest($2::int[]) AS qty
                        ) AS u
                        WHERE p.id = u.id
                    `;
                    await client.query(stockUpdateQuery, [itemProductIds, itemQuantities]);
                }
            }
            
            // Update the order status
            const updateQuery = 'UPDATE orders SET status = $1 WHERE id = $2 RETURNING *';
            const result = await client.query(updateQuery, [status, orderId]);

            await client.query('COMMIT');
            res.json(result.rows[0]);

        } catch (error) {
            await client.query('ROLLBACK');
            logger.error('Error updating order status', error);
            res.status(HTTP.INTERNAL_SERVER_ERROR).json({ error: 'Failed to update order status.' });
        } finally {
            client.release();
        }
    } catch (error) {
        logger.error('Internal server error during order status update', error);
        res.status(HTTP.INTERNAL_SERVER_ERROR).json({ error: 'Internal server error during order status update' });
    }
});

module.exports = router;
