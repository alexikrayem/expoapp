// routes/orders.js (FINAL CORRECTED VERSION)
const express = require('express');
const router = express.Router();
const db = require('../config/db');

// POST / - Create a new order for the authenticated user
router.post('/', async (req, res) => {
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
router.put('/:orderId/status', async (req, res) => {
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
});
module.exports = router;