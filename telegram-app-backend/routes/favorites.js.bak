// routes/favorites.js (SECURE VERSION)
const express = require('express');
const router = express.Router();
const db = require('../config/db');

// GET all favorite product IDs for the authenticated user
router.get('/', async (req, res) => {
    try {
        // SECURE: Get the user ID from the middleware.
        const { id: userId } = req.telegramUser;
        
        const query = 'SELECT product_id FROM user_favorites WHERE user_id = $1';
        const result = await db.query(query, [userId]);
        
        // The client expects an object with a `favorite_ids` array.
        const favorite_ids = result.rows.map(row => row.product_id);
        res.json({ favorite_ids });
        
    } catch (error) {
        console.error('Error fetching favorites:', error);
        res.status(500).json({ error: 'Failed to fetch favorites' });
    }
});

// POST to add a new favorite
router.post('/', async (req, res) => {
    try {
        // SECURE: Get the user ID from the middleware.
        const { id: userId } = req.telegramUser;
        const { productId } = req.body;
        
        if (!productId) {
            return res.status(400).json({ error: 'Product ID is required' });
        }
        
        // This single "UPSERT" query is safer and more efficient.
        // It attempts to insert a new favorite. If it already exists (due to the primary key constraint), it does nothing.
        const query = 'INSERT INTO user_favorites (user_id, product_id) VALUES ($1, $2) ON CONFLICT (user_id, product_id) DO NOTHING';
        await db.query(query, [userId, productId]);
        
        res.status(201).json({ message: 'Added to favorites successfully' });
        
    } catch (error) {
        console.error('Error adding to favorites:', error);
        res.status(500).json({ error: 'Failed to add to favorites' });
    }
});

// DELETE to remove a favorite
router.delete('/:productId', async (req, res) => {
    try {
        // SECURE: Get the user ID from the middleware.
        const { id: userId } = req.telegramUser;
        const { productId } = req.params;
        
        const deleteQuery = 'DELETE FROM user_favorites WHERE user_id = $1 AND product_id = $2';
        await db.query(deleteQuery, [userId, productId]);
        
        // Use 204 No Content for successful deletions, as there's no body to return.
        res.status(204).send();
        
    } catch (error)
    {
        console.error('Error removing from favorites:', error);
        res.status(500).json({ error: 'Failed to remove from favorites' });
    }
});

module.exports = router;