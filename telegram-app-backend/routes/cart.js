// routes/cart.js (SECURE VERSION)
const express = require('express');
const router = express.Router();
const db = require('../config/db');

// GET the user's entire cart
router.get('/', async (req, res) => {
    try {
        // SECURE: Get user ID from the middleware
        const { id: userId } = req.telegramUser;

        const query = `
            SELECT 
                c.product_id,
                c.quantity,
                p.name,
                p.price,
                p.discount_price,
                p.is_on_sale,
                p.image_url,
                p.stock_level,
                s.name as supplier_name,
                CASE 
                    WHEN p.is_on_sale = true AND p.discount_price IS NOT NULL 
                    THEN p.discount_price 
                    ELSE p.price 
                END as effective_selling_price
            FROM cart c
            JOIN products p ON c.product_id = p.id
            JOIN suppliers s ON p.supplier_id = s.id
            WHERE c.user_id = $1 AND p.is_active = true
            ORDER BY c.created_at DESC
        `;

        const result = await db.query(query, [userId]);
        res.json(result.rows);

    } catch (error) {
        console.error('Error fetching cart:', error);
        res.status(500).json({ error: 'Failed to fetch cart' });
    }
});

// POST to add an item or increase its quantity
router.post('/items', async (req, res) => {
    try {
        // SECURE: Get user ID from the middleware
        const { id: userId } = req.telegramUser;
        const { productId, quantity = 1 } = req.body;

        if (!productId) {
            return res.status(400).json({ error: 'Product ID is required' });
        }
        
        // This single, efficient "UPSERT" query handles both adding a new item
        // and increasing the quantity of an existing one.
        // It requires a composite primary key or unique constraint on (user_id, product_id) in your 'cart' table.
        const query = `
            INSERT INTO cart (user_id, product_id, quantity)
            VALUES ($1, $2, $3)
            ON CONFLICT (user_id, product_id)
            DO UPDATE SET
                quantity = cart.quantity + $3,
                updated_at = NOW()
            RETURNING *;
        `;

        const result = await db.query(query, [userId, productId, quantity]);
        res.status(200).json(result.rows[0]);

    } catch (error) {
        console.error('Error adding to cart:', error);
        res.status(500).json({ error: 'Failed to add item to cart' });
    }
});

// PUT to update a specific item's quantity
router.put('/items/:productId', async (req, res) => {
    try {
        // SECURE: Get user ID from the middleware
        const { id: userId } = req.telegramUser;
        const { productId } = req.params;
        const { quantity } = req.body;

        if (typeof quantity !== 'number' || quantity < 0) {
            return res.status(400).json({ error: 'A valid, non-negative quantity is required' });
        }

        if (quantity === 0) {
            // If quantity is 0, delete the item.
            await db.query('DELETE FROM cart WHERE user_id = $1 AND product_id = $2', [userId, productId]);
            res.status(204).send(); // 204 No Content for successful deletion
        } else {
            // Otherwise, update the quantity to the new value.
            const query = 'UPDATE cart SET quantity = $1, updated_at = NOW() WHERE user_id = $2 AND product_id = $3 RETURNING *';
            const result = await db.query(query, [quantity, userId, productId]);
            
            if (result.rowCount === 0) {
                return res.status(404).json({ message: "Cart item not found to update." });
            }
            res.status(200).json(result.rows[0]);
        }

    } catch (error) {
        console.error('Error updating cart:', error);
        res.status(500).json({ error: 'Failed to update cart' });
    }
});

// DELETE to remove an item from the cart
router.delete('/items/:productId', async (req, res) => {
    try {
        // SECURE: Get user ID from the middleware
        const { id: userId } = req.telegramUser;
        const { productId } = req.params;

        await db.query('DELETE FROM cart WHERE user_id = $1 AND product_id = $2', [userId, productId]);
        res.status(204).send(); // 204 No Content for successful deletion

    } catch (error) {
        console.error('Error removing from cart:', error);
        res.status(500).json({ error: 'Failed to remove item from cart' });
    }
});

module.exports = router;