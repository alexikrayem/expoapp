// routes/cart.js (FINAL CORRECTED VERSION)
const express = require('express');
const { body, param, validationResult } = require('express-validator');
const router = express.Router();
const db = require('../config/db');

// Validation middleware for cart operations
const validateAddToCart = [
    body('productId').isInt({ min: 1 }).withMessage('Product ID must be a positive integer'),
    body('quantity').optional().isInt({ min: 1, max: 999 }).withMessage('Quantity must be between 1 and 999')
];

const validateUpdateCart = [
    param('productId').isInt({ min: 1 }).withMessage('Product ID must be a positive integer'),
    body('quantity').isInt({ min: 0, max: 999 }).withMessage('Quantity must be between 0 and 999')
];

const validateCartParams = [
    param('productId').isInt({ min: 1 }).withMessage('Product ID must be a positive integer')
];

// GET the user's entire cart
router.get('/', async (req, res) => {
    try {
        const { id: userId } = req.telegramUser;

        const query = `
            SELECT 
                c.product_id, c.quantity, p.name, p.price, p.discount_price,
                p.is_on_sale, p.image_url, p.stock_level, s.name as supplier_name,
                CASE WHEN p.is_on_sale = true AND p.discount_price IS NOT NULL THEN p.discount_price ELSE p.price END as effective_selling_price
            FROM cart_items c -- FIX: Corrected table name
            JOIN products p ON c.product_id = p.id
            JOIN suppliers s ON p.supplier_id = s.id
            WHERE c.user_id = $1 AND s.is_active = true -- FIX: Removed p.is_active
            ORDER BY c.added_at DESC
        `;

        const result = await db.query(query, [userId]);
        res.json(result.rows);

    } catch (error) {
        console.error('Error fetching cart:', error);
        res.status(500).json({ error: 'Failed to fetch cart' });
    }
});

// POST to add an item or increase its quantity
router.post('/items', validateAddToCart, async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ error: 'Validation failed', details: errors.array() });
        }
        
        const { id: userId } = req.telegramUser;
        const { productId, quantity = 1 } = req.body;

        if (!productId) {
            return res.status(400).json({ error: 'Product ID is required' });
        }
        
        const query = `
            INSERT INTO cart_items (user_id, product_id, quantity, added_at) -- FIX: Corrected table name
            VALUES ($1, $2, $3, NOW())
            ON CONFLICT (user_id, product_id)
            DO UPDATE SET
                quantity = cart_items.quantity + $3 -- FIX: Use correct table name here too
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
router.put('/items/:productId', validateUpdateCart, async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ error: 'Validation failed', details: errors.array() });
        }
        
        const { id: userId } = req.telegramUser;
        const { productId } = req.params;
        const { quantity } = req.body;

        if (typeof quantity !== 'number' || quantity < 0) {
            return res.status(400).json({ error: 'A valid, non-negative quantity is required' });
        }

        if (quantity === 0) {
            await db.query('DELETE FROM cart_items WHERE user_id = $1 AND product_id = $2', [userId, productId]); // FIX: Corrected table name
            res.status(204).send();
        } else {
            const query = 'UPDATE cart_items SET quantity = $1 WHERE user_id = $2 AND product_id = $3 RETURNING *'; // FIX: Corrected table name
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
router.delete('/items/:productId', validateCartParams, async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ error: 'Validation failed', details: errors.array() });
        }
        
        const { id: userId } = req.telegramUser;
        const { productId } = req.params;
        
        await db.query('DELETE FROM cart_items WHERE user_id = $1 AND product_id = $2', [userId, productId]); // FIX: Corrected table name
        res.status(204).send();

    } catch (error) {
        console.error('Error removing from cart:', error);
        res.status(500).json({ error: 'Failed to remove item from cart' });
    }
});

module.exports = router;