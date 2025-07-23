// routes/cities.js (CORRECTED)
const express = require('express');
const router = express.Router();
const db = require('../config/db');

// Get all cities
router.get('/', async (req, res) => {
    try {
        const query = 'SELECT * FROM cities WHERE is_active = true ORDER BY name ASC';
        const result = await db.query(query);
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching cities:', error);
        res.status(500).json({ error: 'Failed to fetch cities' });
    }
});

// Get suppliers in a city
router.get('/:cityId/suppliers', async (req, res) => {
    try {
        const { cityId } = req.params;
        
        // FIX: The query now joins with `supplier_cities` to filter by city.
        // It also removes the incorrect `p.is_active` check.
        const query = `
            SELECT 
                s.*,
                COUNT(p.id) as product_count
            FROM suppliers s
            JOIN supplier_cities sc ON s.id = sc.supplier_id
            LEFT JOIN products p ON s.id = p.supplier_id
            WHERE sc.city_id = $1 AND s.is_active = true
            GROUP BY s.id
            ORDER BY s.name ASC
        `;
        
        const result = await db.query(query, [cityId]);
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching suppliers:', error);
        res.status(500).json({ error: 'Failed to fetch suppliers' });
    }
});

// Get deals in a city
router.get('/:cityId/deals', async (req, res) => {
    try {
        const { cityId } = req.params;
        
        // FIX: The query now joins with `supplier_cities` to filter by city.
        const query = `
            SELECT 
                d.*,
                s.name as supplier_name,
                p.name as product_name
            FROM deals d
            JOIN suppliers s ON d.supplier_id = s.id
            JOIN supplier_cities sc ON s.id = sc.supplier_id
            LEFT JOIN products p ON d.product_id = p.id
            WHERE sc.city_id = $1 AND d.is_active = true AND s.is_active = true
            AND (d.start_date IS NULL OR d.start_date <= NOW())
            AND (d.end_date IS NULL OR d.end_date >= NOW())
            ORDER BY d.created_at DESC
        `;
        
        const result = await db.query(query, [cityId]);
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching deals:', error);
        res.status(500).json({ error: 'Failed to fetch deals' });
    }
});

module.exports = router;