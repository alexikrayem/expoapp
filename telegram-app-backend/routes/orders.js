// routes/orders.js (FINAL CORRECTED VERSION)
const express = require('express');
const { body, param, validationResult } = require('express-validator');
const router = express.Router();
const db = require('../config/db');
const telegramBotService = require('../services/telegramBot');

// Validation middleware for order operations
const validateCreateOrder = [
    body('items').isArray({ min: 1, max: 50 }).withMessage('Items must be a non-empty array with max 50 items'),
    body('items.*.product_id').isInt({ min: 1, max: 999999 }).withMessage('Each product ID must be a positive integer'),
    body('items.*.quantity').isInt({ min: 1, max: 999 }).withMessage('Each quantity must be between 1 and 999'),
    body('items.*.price_at_time_of_order').isFloat({ min: 0, max: 999999 }).withMessage('Price at time of order must be a positive number'),
    body('total_amount').isFloat({ min: 0, max: 9999999 }).withMessage('Total amount must be a positive number')
];

const validateOrderStatusUpdate = [
    param('orderId').isInt({ min: 1, max: 9999999 }).withMessage('Order ID must be a positive integer'),
    body('status').isIn(['cancelled']).withMessage('Only "cancelled" status is allowed for updates')
];

// POST /from-cart - Create a new order from frontend cart data
router.post('/from-cart', validateCreateOrder, async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ error: 'Validation failed', details: errors.array() });
        }
        
        const { id: userId } = req.telegramUser;
        const { items, total_amount } = req.body;
        
        if (!items || !Array.isArray(items) || items.length === 0) {
            return res.status(400).json({ error: 'Cart items are required' });
        }

        const client = await db.pool.connect();

        try {
            await client.query('BEGIN');

            // Step 1: Verify all products exist and have sufficient stock
            for (const item of items) {
                const productQuery = 'SELECT id, name, stock_level, supplier_id FROM products WHERE id = $1';
                const productResult = await client.query(productQuery, [item.product_id]);
                
                if (productResult.rows.length === 0) {
                    await client.query('ROLLBACK');
                    return res.status(400).json({ error: `Product with ID ${item.product_id} not found` });
                }
                
                const product = productResult.rows[0];
                if (product.stock_level < item.quantity) {
                    await client.query('ROLLBACK');
                    return res.status(409).json({ error: `Insufficient stock for product: ${product.name}` });
                }
            }
            
            // Step 2: Get user's profile for validation
            const userResult = await client.query('SELECT * FROM user_profiles WHERE user_id = $1', [userId]);
            if (userResult.rows.length === 0 || !userResult.rows[0].address_line1) {
                await client.query('ROLLBACK');
                return res.status(400).json({ error: 'User profile or address is incomplete.' });
            }

            // Step 3: Create the main order record
            const orderQuery = `
                INSERT INTO orders (user_id, total_amount, order_date, status, delivery_status)
                VALUES ($1, $2, NOW(), 'pending', 'pending_pickup')
                RETURNING id
            `;
            const orderResult = await client.query(orderQuery, [userId, total_amount]);
            const orderId = orderResult.rows[0].id;

            // Step 4: Create order_items records and update product stock
            for (const item of items) {
                const orderItemQuery = `
                    INSERT INTO order_items (
                        order_id, product_id, quantity, price_at_time_of_order
                    ) VALUES ($1, $2, $3, $4)
                `;
                await client.query(orderItemQuery, [orderId, item.product_id, item.quantity, item.price_at_time_of_order]);
                
                // Update stock
                const updateStockQuery = 'UPDATE products SET stock_level = stock_level - $1 WHERE id = $2';
                await client.query(updateStockQuery, [item.quantity, item.product_id]);
            }

            await client.query('COMMIT');
            
            // Send notification to delivery agent
            try {
                // Get supplier info for the first item (assuming all items are from same supplier for now)
                const supplierQuery = `
                    SELECT DISTINCT s.id, s.name
                    FROM suppliers s
                    JOIN products p ON s.id = p.supplier_id
                    WHERE p.id = ANY($1::int[])
                `;
                const productIds = items.map(item => item.product_id);
                const supplierResult = await client.query(supplierQuery, [productIds]);
                
                if (supplierResult.rows.length > 0) {
                    const supplier = supplierResult.rows[0];
                    
                    // Get customer info
                    const customerQuery = 'SELECT * FROM user_profiles WHERE user_id = $1';
                    const customerResult = await client.query(customerQuery, [userId]);
                    const customer = customerResult.rows[0];
                    
                    const orderNotificationData = {
                        orderId,
                        supplierId: supplier.id,
                        total_amount,
                        items: items.map(item => ({
                            product_name: item.name || 'Unknown Product',
                            quantity: item.quantity,
                            price_at_time_of_order: item.price_at_time_of_order
                        })),
                        customerInfo: {
                            name: customer?.full_name || 'غير محدد',
                            phone: customer?.phone_number || 'غير محدد',
                            address1: customer?.address_line1 || 'غير محدد',
                            address2: customer?.address_line2,
                            city: customer?.city || 'غير محدد'
                        },
                        orderDate: new Date().toISOString()
                    };
                    
                    await telegramBotService.sendOrderNotificationToDeliveryAgent(orderNotificationData);
                }
            } catch (notificationError) {
                console.error('Failed to send order notification:', notificationError);
                // Don't fail the order creation if notification fails
            }
            
            res.status(201).json({ orderId, message: 'Order created successfully' });

        } catch (error) {
            await client.query('ROLLBACK');
            console.error('Error creating order from cart:', error);
            res.status(500).json({ error: 'Failed to create order due to a server error.' });
        } finally {
            client.release();
        }
    } catch (error) {
        res.status(500).json({ error: 'Internal server error during order creation' });
    }
});

// POST / - Create a new order for the authenticated user
router.post('/', async (req, res) => {
    try {
        const { id: userId } = req.telegramUser;
        const client = await db.pool.connect();

        try {
            await client.query('BEGIN');

            // Step 1: Get user's cart items from the correct table 'cart_items'
            // FIX: Removed the non-existent 'p.is_active' check
            const cartQuery = `
                SELECT 
                    c.product_id, c.quantity, p.name as product_name, p.supplier_id, p.stock_level,
                    CASE WHEN p.is_on_sale = true AND p.discount_price IS NOT NULL 
                         THEN p.discount_price ELSE p.price 
                    END as effective_price
                FROM cart_items c -- FIX: Corrected table name
                JOIN products p ON c.product_id = p.id
                WHERE c.user_id = $1 AND p.stock_level > 0 FOR UPDATE
            `;
            const cartResult = await client.query(cartQuery, [userId]);
            
            if (cartResult.rows.length === 0) {
                await client.query('ROLLBACK');
                return res.status(400).json({ error: 'Cart is empty. Cannot create order.' });
            }

            // Step 2: Verify stock levels
            for (const item of cartResult.rows) {
                if (item.quantity > item.stock_level) {
                    await client.query('ROLLBACK');
                    return res.status(409).json({ error: `Insufficient stock for product: ${item.product_name}.` });
                }
            }
            
            // Step 3: Get user's profile for details (we will now store these in order_items or a separate order_shipping table if needed)
            const userResult = await client.query('SELECT * FROM user_profiles WHERE user_id = $1', [userId]);
            if (userResult.rows.length === 0 || !userResult.rows[0].address_line1) {
                await client.query('ROLLBACK');
                return res.status(400).json({ error: 'User profile or address is incomplete.' });
            }
            // NOTE: The user's address is NOT stored in the `orders` table according to your schema.
            // This is acceptable, but for historical accuracy, you might later want an `order_shipping_details` table.

            // Step 4: Calculate total amount
            const totalAmount = cartResult.rows.reduce((sum, item) => sum + (item.effective_price * item.quantity), 0);

            // Step 5: Create the main order record with the CORRECT columns
            // FIX: The INSERT statement now matches your actual 'orders' table schema.
            const orderQuery = `
                INSERT INTO orders (user_id, total_amount, order_date, status, delivery_status)
                VALUES ($1, $2, NOW(), 'pending', 'pending_pickup')
                RETURNING id
            `;
            const orderResult = await client.query(orderQuery, [userId, totalAmount]);
            const orderId = orderResult.rows[0].id;

            // Step 6: Create order_items records and update product stock
           for (const item of cartResult.rows) {
        // FIX: Removed the non-existent 'supplier_id' column from the query
        const orderItemQuery = `
            INSERT INTO order_items (
                order_id, product_id, quantity, price_at_time_of_order
            ) VALUES ($1, $2, $3, $4)
        `;
        // FIX: Removed item.supplier_id from the values array
        await client.query(orderItemQuery, [orderId, item.product_id, item.quantity, item.effective_price]);
        
        // This part remains the same
        const updateStockQuery = 'UPDATE products SET stock_level = stock_level - $1 WHERE id = $2';
        await client.query(updateStockQuery, [item.quantity, item.product_id]);
    }

            // Step 7: Clear the user's cart from the correct table
            await client.query('DELETE FROM cart_items WHERE user_id = $1', [userId]); // FIX: Corrected table name

            await client.query('COMMIT');
            res.status(201).json({ orderId, message: 'Order created successfully' });

        } catch (error) {
            await client.query('ROLLBACK');
            console.error('Error creating order:', error);
            res.status(500).json({ error: 'Failed to create order due to a server error.' });
        } finally {
            client.release();
        }
    } catch (error) {
        res.status(500).json({ error: 'Internal server error during order creation' });
    }
});

// GET / - Get all orders for the authenticated user (This route was already correct)
router.get('/', async (req, res) => {
    try {
        const { id: userId } = req.telegramUser;
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
        console.error('Error fetching orders:', error);
        res.status(500).json({ error: 'Failed to fetch orders' });
    }
});

// PUT /:orderId/status - Update the status of an order
router.put('/:orderId/status', validateOrderStatusUpdate, async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ error: 'Validation failed', details: errors.array() });
        }
        
        const { id: userId } = req.telegramUser;
        const { orderId } = req.params;
        const { status } = req.body;

        // Basic validation
        if (!status || !['cancelled'].includes(status)) { // Only allow cancelling for now
            return res.status(400).json({ error: 'Invalid or unsupported status update.' });
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
                return res.status(404).json({ error: 'Order not found or it cannot be cancelled.' });
            }

            // If cancelling, restore the stock for the items in the order
            if (status === 'cancelled') {
                const itemsQuery = 'SELECT product_id, quantity FROM order_items WHERE order_id = $1';
                const itemsResult = await client.query(itemsQuery, [orderId]);
                
                for (const item of itemsResult.rows) {
                    const stockUpdateQuery = 'UPDATE products SET stock_level = stock_level + $1 WHERE id = $2';
                    await client.query(stockUpdateQuery, [item.quantity, item.product_id]);
                }
            }
            
            // Update the order status
            const updateQuery = 'UPDATE orders SET status = $1 WHERE id = $2 RETURNING *';
            const result = await client.query(updateQuery, [status, orderId]);

            await client.query('COMMIT');
            res.json(result.rows[0]);

        } catch (error) {
            await client.query('ROLLBACK');
            console.error('Error updating order status:', error);
            res.status(500).json({ error: 'Failed to update order status.' });
        } finally {
            client.release();
        }
    } catch (error) {
        res.status(500).json({ error: 'Internal server error during order status update' });
    }
});

module.exports = router;