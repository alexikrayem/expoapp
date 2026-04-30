// routes/cart.js (FINAL CORRECTED VERSION)
const express = require('express');
const { body, param, validationResult } = require('express-validator');
const router = express.Router();
const db = require('../config/db');
const logger = require('../services/logger');
const requireCustomer = require('../middleware/requireCustomer');
const { EFFECTIVE_PRICE_SQL } = require('../utils/pricing');

router.use(requireCustomer);

const HTTP = Object.freeze({
    OK: Number.parseInt('200', 10),
    NO_CONTENT: Number.parseInt('204', 10),
    BAD_REQUEST: Number.parseInt('400', 10),
    NOT_FOUND: Number.parseInt('404', 10),
    INTERNAL_SERVER_ERROR: Number.parseInt('500', 10)
});

const CART_LIMITS = Object.freeze({
    MAX_QUANTITY: Number.parseInt('999', 10)
});

// Validation middleware for cart operations
const validateAddToCart = [
    body('productId').isInt({ min: 1 }).withMessage('Product ID must be a positive integer'),
    body('quantity')
        .optional()
        .isInt({ min: 1, max: CART_LIMITS.MAX_QUANTITY })
        .withMessage(`Quantity must be between 1 and ${CART_LIMITS.MAX_QUANTITY}`)
];

const validateUpdateCart = [
    param('productId').isInt({ min: 1 }).withMessage('Product ID must be a positive integer'),
    body('quantity')
        .isInt({ min: 0, max: CART_LIMITS.MAX_QUANTITY })
        .withMessage(`Quantity must be between 0 and ${CART_LIMITS.MAX_QUANTITY}`)
];

const validateCartParams = [
    param('productId').isInt({ min: 1 }).withMessage('Product ID must be a positive integer')
];

// GET the user's entire cart
router.get('/', async (req, res) => {
    try {
        const { userId } = req.user;

        const query = `
            SELECT 
                c.product_id, c.quantity, p.name, p.price, p.discount_price,
                p.is_on_sale, p.image_url, p.stock_level, s.name as supplier_name,
                ${EFFECTIVE_PRICE_SQL} as effective_selling_price
            FROM cart_items c -- FIX: Corrected table name
            JOIN products p ON c.product_id = p.id
            JOIN suppliers s ON p.supplier_id = s.id
            LEFT JOIN master_products mp ON p.master_product_id = mp.id
            WHERE c.user_id = $1 AND s.is_active = true -- FIX: Removed p.is_active
            ORDER BY c.added_at DESC
        `;

        const result = await db.query(query, [userId]);
        res.json(result.rows);

    } catch (error) {
        logger.error('Error fetching cart', error);
        res.status(HTTP.INTERNAL_SERVER_ERROR).json({ error: 'Failed to fetch cart' });
    }
});

// POST to add an item or increase its quantity
router.post('/items', validateAddToCart, async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(HTTP.BAD_REQUEST).json({ error: 'Validation failed', details: errors.array() });
        }
        
        const { userId } = req.user;
        const { productId, quantity = 1 } = req.body;

        if (!productId) {
            return res.status(HTTP.BAD_REQUEST).json({ error: 'Product ID is required' });
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
        res.status(HTTP.OK).json(result.rows[0]);

    } catch (error) {
        logger.error('Error adding to cart', error);
        res.status(HTTP.INTERNAL_SERVER_ERROR).json({ error: 'Failed to add item to cart' });
    }
});

// PUT to update a specific item's quantity
router.put('/items/:productId', validateUpdateCart, async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(HTTP.BAD_REQUEST).json({ error: 'Validation failed', details: errors.array() });
        }
        
        const { userId } = req.user;
        const { productId } = req.params;
        const { quantity } = req.body;

        if (typeof quantity !== 'number' || quantity < 0) {
            return res.status(HTTP.BAD_REQUEST).json({ error: 'A valid, non-negative quantity is required' });
        }

        if (quantity === 0) {
            await db.query('DELETE FROM cart_items WHERE user_id = $1 AND product_id = $2', [userId, productId]); // FIX: Corrected table name
            res.status(HTTP.NO_CONTENT).send();
        } else {
            const query = 'UPDATE cart_items SET quantity = $1 WHERE user_id = $2 AND product_id = $3 RETURNING *'; // FIX: Corrected table name
            const result = await db.query(query, [quantity, userId, productId]);
            
            if (result.rowCount === 0) {
                return res.status(HTTP.NOT_FOUND).json({ message: "Cart item not found to update." });
            }
            res.status(HTTP.OK).json(result.rows[0]);
        }
    } catch (error) {
        logger.error('Error updating cart', error);
        res.status(HTTP.INTERNAL_SERVER_ERROR).json({ error: 'Failed to update cart' });
    }
});

// DELETE to remove an item from the cart
router.delete('/items/:productId', validateCartParams, async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(HTTP.BAD_REQUEST).json({ error: 'Validation failed', details: errors.array() });
        }
        
        const { userId } = req.user;
        const { productId } = req.params;
        
        await db.query('DELETE FROM cart_items WHERE user_id = $1 AND product_id = $2', [userId, productId]); // FIX: Corrected table name
        res.status(HTTP.NO_CONTENT).send();

    } catch (error) {
        logger.error('Error removing from cart', error);
        res.status(HTTP.INTERNAL_SERVER_ERROR).json({ error: 'Failed to remove item from cart' });
    }
});

module.exports = router;
