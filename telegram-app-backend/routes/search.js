// routes/search.js (UPGRADED SEARCH LOGIC WITH FUZZY MATCHING)
const express = require('express');
const router = express.Router();
const { cacheResponse } = require('../middleware/cache');
const { searchCatalog } = require('../services/searchService');
const { searchLimiter } = require('../middleware/rateLimiters');
const { query } = require('express-validator');
const validateRequest = require('../middleware/validateRequest');

// Search across products, deals, and suppliers
router.get('/', [
    query('searchTerm').optional().trim().isLength({ max: 100 }).withMessage('Search term must be at most 100 characters'),
    query('cityId').optional().isInt({ min: 1 }).withMessage('City ID must be a positive integer'),
    query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('Limit must be between 1 and 50'),
    validateRequest
], searchLimiter, cacheResponse(30, 'search'), async (req, res) => {
    try {
        const { searchTerm, cityId, limit = 20 } = req.query;

        if (!searchTerm || searchTerm.trim().length < 2) {
            return res.json({
                results: { products: { items: [], totalItems: 0 }, deals: [], suppliers: [] }
            });
        }

        const search = await searchCatalog({ searchTerm, cityId, limit });
        res.json(search);

    } catch (error) {
        console.error('Error performing search:', error);
        res.status(500).json({ error: 'Failed to perform search' });
    }
});

module.exports = router;
