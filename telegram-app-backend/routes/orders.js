// routes/orders.js (SECURE VERSION)
const express = require('express');
const router = express.Router();
const db = require('../config/db');

// POST / - Create a new order for the authenticated user
router.post('/', async (req, res) => {
    // SECURE: Get user ID from the middleware, NOT the request body.
    const { id: userId } = req.telegramUser;
    
    // We get a client from the pool to run multiple queries in a single transaction.
    const client = await db.pool.connect();

    try {
        // Start the transaction
        await client.query('BEGIN');

        // Step 1: Get the user's current cart items
        const cartQuery = `
            SELECT 
                c.product_id,
                c.quantity,
                p.price,
                p.discount_price,
                p.is_on_sale,
                p.name as product_name,
                p.supplier_id,
                p.stock_level,
                CASE 
                    WHEN p.is_on_sale = true AND p.discount_price IS NOT NULL 
                    THEN p.discount_price 
                    ELSE p.price 
                END as effective_price
            FROM cart c
            JOIN products p ON c.product_id = p.id
            WHERE c.user_id = $1 AND p.is_active = true FOR UPDATE
        `;
        // "FOR UPDATE" locks the selected product rows to prevent stock changes during checkout.
        
        const cartResult = await client.query(cartQuery, [userId]);
        
        if (cartResult.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(400).json({ error: 'Cart is empty. Cannot create order.' });
        }

        // Step 2: Verify stock levels for all cart items
        for (const item of cartResult.rows) {
            if (item.quantity > item.stock_level) {
                await client.query('ROLLBACK');
                return res.status(409).json({ // 409 Conflict is a good status code for this
                    error: `Insufficient stock for product: ${item.product_name}. Only ${item.stock_level} available.`
                });
            }
        }
        
        // Step 3: Get the user's profile for shipping details
        const userQuery = 'SELECT * FROM user_profiles WHERE user_id = $1';
        const userResult = await client.query(userQuery, [userId]);
        
        if (userResult.rows.length === 0 || !userResult.rows[0].address_line1) {
            await client.query('ROLLBACK');
            return res.status(400).json({ error: 'User profile or address is incomplete. Cannot create order.' });
        }
        const userProfile = userResult.rows[0];

        // Step 4: Calculate the total amount
        const totalAmount = cartResult.rows.reduce((sum, item) => sum + (item.effective_price * item.quantity), 0);

        // Step 5: Create the main order record
        const orderQuery = `
            INSERT INTO orders (
                user_id, customer_name, customer_phone, customer_address1, 
                customer_address2, customer_city, total_amount, status
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending')
            RETURNING id
        `;
        const orderResult = await client.query(orderQuery, [
            userId, userProfile.full_name, userProfile.phone_number, userProfile.address_line1,
            userProfile.address_line2, userProfile.address_city_text, totalAmount
        ]);
        const orderId = orderResult.rows[0].id;

        // Step 6: Create order_items records and update product stock
        for (const item of cartResult.rows) {
            const orderItemQuery = `
                INSERT INTO order_items (
                    order_id, product_id, quantity, price_at_time_of_order, supplier_id
                ) VALUES ($1, $2, $3, $4, $5)
            `;
            await client.query(orderItemQuery, [orderId, item.product_id, item.quantity, item.effective_price, item.supplier_id]);
            
            // Decrease the stock level for the product
            const updateStockQuery = 'UPDATE products SET stock_level = stock_level - $1 WHERE id = $2';
            await client.query(updateStockQuery, [item.quantity, item.product_id]);
        }

        // Step 7: Clear the user's cart
        await client.query('DELETE FROM cart WHERE user_id = $1', [userId]);

        // If all queries succeeded, commit the transaction
        await client.query('COMMIT');

        // Respond with success
        res.status(201).json({
            orderId,
            message: 'Order created successfully',
            totalAmount
        });

    } catch (error) {
        // If any query fails, the whole transaction is rolled back.
        await client.query('ROLLBACK');
        console.error('Error creating order:', error);
        res.status(500).json({ error: 'Failed to create order due to a server error.' });
    } finally {
        // Release the database client back to the pool
        client.release();
    }
});

// GET / - Get all orders for the authenticated user
router.get('/', async (req, res) => {
    try {
        // SECURE: Get user ID from the middleware
        const { id: userId } = req.telegramUser;

        const ordersQuery = `
            SELECT 
                o.*,
                json_agg(
                    json_build_object(
                        'product_id', oi.product_id,
                        'product_name', p.name,
                        'quantity', oi.quantity,
                        'price_at_time_of_order', oi.price_at_time_of_order
                    )
                ) as items
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

module.exports = router;