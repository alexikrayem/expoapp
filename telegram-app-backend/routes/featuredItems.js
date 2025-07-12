// routes/featuredItems.js
const express = require('express');
const router = express.Router();
const db = require('../config/db');

// Get featured items for the slider
router.get('/', async (req, res) => {
    try {
        const query = `
            SELECT 
                fd.id as feature_definition_id,
                fd.item_type,
                fd.item_id,
                fd.display_order,
                fd.custom_title,
                fd.custom_description,
                fd.custom_image_url,
                fd.is_active,
                fd.active_from,
                fd.active_until,
                CASE 
                    WHEN fd.item_type = 'product' THEN p.name
                    WHEN fd.item_type = 'deal' THEN d.title
                    WHEN fd.item_type = 'supplier' THEN s.name
                END as original_item_name,
                CASE 
                    WHEN fd.item_type = 'product' THEN p.description
                    WHEN fd.item_type = 'deal' THEN d.description
                    WHEN fd.item_type = 'supplier' THEN s.description
                END as original_item_description,
                CASE 
                    WHEN fd.item_type = 'product' THEN p.image_url
                    WHEN fd.item_type = 'deal' THEN d.image_url
                    WHEN fd.item_type = 'supplier' THEN s.image_url
                END as original_item_image_url
            FROM featured_items_definitions fd
            LEFT JOIN products p ON fd.item_type = 'product' AND fd.item_id = p.id
            LEFT JOIN deals d ON fd.item_type = 'deal' AND fd.item_id = d.id
            LEFT JOIN suppliers s ON fd.item_type = 'supplier' AND fd.item_id = s.id
            WHERE fd.is_active = true
            AND (fd.active_from IS NULL OR fd.active_from <= NOW())
            AND (fd.active_until IS NULL OR fd.active_until >= NOW())
            ORDER BY fd.display_order ASC, fd.created_at DESC
        `;
        
        const result = await db.query(query);
        
        // Transform the data for the frontend
        const featuredItems = result.rows.map(row => ({
            id: row.item_id,
            type: row.item_type,
            title: row.custom_title || row.original_item_name || 'Featured Item',
            description: row.custom_description || row.original_item_description || '',
            imageUrl: row.custom_image_url || row.original_item_image_url || 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            displayOrder: row.display_order
        }));
        
        res.json(featuredItems);
        
    } catch (error) {
        console.error('Error fetching featured items:', error);
        res.status(500).json({ error: 'Failed to fetch featured items' });
    }
});

module.exports = router;