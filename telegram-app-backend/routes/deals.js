// routes/deals.js
const express = require('express');
const router = express.Router();
const db = require('../config/db');
const authSupplier = require('../middleware/authSupplier');

// Get deals (with optional city filter)
router.get('/', async (req, res) => {
    try {
        const { cityId } = req.query;
        
        let query = `
            SELECT 
                d.*,
                s.name as supplier_name,
                p.name as product_name
            FROM deals d
            JOIN suppliers s ON d.supplier_id = s.id
            LEFT JOIN products p ON d.product_id = p.id
            WHERE d.is_active = true
            AND (d.start_date IS NULL OR d.start_date <= NOW())
            AND (d.end_date IS NULL OR d.end_date >= NOW())
        `;
        
        const queryParams = [];
        
       if (cityId) {
    query += `
        AND EXISTS (
            SELECT 1
            FROM supplier_cities sc
            WHERE sc.supplier_id = s.id
            AND sc.city_id = $1
        )
    `;
    queryParams.push(cityId);
}
        
        query += ' ORDER BY d.created_at DESC';
        
        const result = await db.query(query, queryParams);
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching deals:', error);
        res.status(500).json({ error: 'Failed to fetch deals' });
    }
});

// Get deal details
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        const query = `
            SELECT 
                d.*,
                s.name as supplier_name,
                s.location as supplier_location,
                p.name as product_name,
                p.price as product_price,
                p.image_url as product_image_url
            FROM deals d
            JOIN suppliers s ON d.supplier_id = s.id
            LEFT JOIN products p ON d.product_id = p.id
            WHERE d.id = $1 AND d.is_active = true
        `;
        
        const result = await db.query(query, [id]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Deal not found' });
        }
        
        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error fetching deal details:', error);
        res.status(500).json({ error: 'Failed to fetch deal details' });
    }
});

// Get supplier's own deals (authenticated)
router.get('/supplier/deals', authSupplier, async (req, res) => {
    try {
        const supplierId = req.supplier.supplierId;
        
        const query = `
            SELECT 
                d.*,
                p.name as product_name
            FROM deals d
            LEFT JOIN products p ON d.product_id = p.id
            WHERE d.supplier_id = $1
            ORDER BY d.created_at DESC
        `;
        
        const result = await db.query(query, [supplierId]);
        res.json(result.rows);
        
    } catch (error) {
        console.error('Error fetching supplier deals:', error);
        res.status(500).json({ error: 'Failed to fetch deals' });
    }
});

// Create new deal (authenticated supplier)
router.post('/supplier/deals', authSupplier, async (req, res) => {
    try {
        const supplierId = req.supplier.supplierId;
        const {
            title, description, discount_percentage, start_date, end_date,
            product_id, image_url, is_active = true
        } = req.body;
        
        if (!title) {
            return res.status(400).json({ error: 'Title is required' });
        }
        
        const insertQuery = `
            INSERT INTO deals (
                title, description, discount_percentage, start_date, end_date,
                product_id, image_url, is_active, supplier_id
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            RETURNING *
        `;
        
        const result = await db.query(insertQuery, [
            title, description, discount_percentage ? parseFloat(discount_percentage) : null,
            start_date || null, end_date || null, product_id ? parseInt(product_id) : null,
            image_url, Boolean(is_active), supplierId
        ]);
        
        res.status(201).json(result.rows[0]);
        
    } catch (error) {
        console.error('Error creating deal:', error);
        res.status(500).json({ error: 'Failed to create deal' });
    }
});

// Update deal (authenticated supplier)
router.put('/supplier/deals/:id', authSupplier, async (req, res) => {
    try {
        const { id } = req.params;
        const supplierId = req.supplier.supplierId;
        const {
            title, description, discount_percentage, start_date, end_date,
            product_id, image_url, is_active
        } = req.body;
        
        // Verify deal belongs to this supplier
        const verifyQuery = 'SELECT id FROM deals WHERE id = $1 AND supplier_id = $2';
        const verifyResult = await db.query(verifyQuery, [id, supplierId]);
        
        if (verifyResult.rows.length === 0) {
            return res.status(404).json({ error: 'Deal not found or not owned by you' });
        }
        
        const updateFields = [];
        const updateValues = [];
        let paramIndex = 1;
        
        if (title !== undefined) {
            updateFields.push(`title = $${paramIndex}`);
            updateValues.push(title);
            paramIndex++;
        }
        
        if (description !== undefined) {
            updateFields.push(`description = $${paramIndex}`);
            updateValues.push(description);
            paramIndex++;
        }
        
        if (discount_percentage !== undefined) {
            updateFields.push(`discount_percentage = $${paramIndex}`);
            updateValues.push(discount_percentage ? parseFloat(discount_percentage) : null);
            paramIndex++;
        }
        
        if (start_date !== undefined) {
            updateFields.push(`start_date = $${paramIndex}`);
            updateValues.push(start_date || null);
            paramIndex++;
        }
        
        if (end_date !== undefined) {
            updateFields.push(`end_date = $${paramIndex}`);
            updateValues.push(end_date || null);
            paramIndex++;
        }
        
        if (product_id !== undefined) {
            updateFields.push(`product_id = $${paramIndex}`);
            updateValues.push(product_id ? parseInt(product_id) : null);
            paramIndex++;
        }
        
        if (image_url !== undefined) {
            updateFields.push(`image_url = $${paramIndex}`);
            updateValues.push(image_url);
            paramIndex++;
        }
        
        if (is_active !== undefined) {
            updateFields.push(`is_active = $${paramIndex}`);
            updateValues.push(Boolean(is_active));
            paramIndex++;
        }
        
        if (updateFields.length === 0) {
            return res.status(400).json({ error: 'No fields to update' });
        }
        
        updateFields.push(`updated_at = NOW()`);
        updateValues.push(id);
        
        const updateQuery = `
            UPDATE deals 
            SET ${updateFields.join(', ')}
            WHERE id = $${paramIndex}
            RETURNING *
        `;
        
        const result = await db.query(updateQuery, updateValues);
        res.json(result.rows[0]);
        
    } catch (error) {
        console.error('Error updating deal:', error);
        res.status(500).json({ error: 'Failed to update deal' });
    }
});

// Delete deal (authenticated supplier)
router.delete('/supplier/deals/:id', authSupplier, async (req, res) => {
    try {
        const { id } = req.params;
        const supplierId = req.supplier.supplierId;
        
        // Verify deal belongs to this supplier
        const verifyQuery = 'SELECT id FROM deals WHERE id = $1 AND supplier_id = $2';
        const verifyResult = await db.query(verifyQuery, [id, supplierId]);
        
        if (verifyResult.rows.length === 0) {
            return res.status(404).json({ error: 'Deal not found or not owned by you' });
        }
        
        const deleteQuery = 'DELETE FROM deals WHERE id = $1';
        await db.query(deleteQuery, [id]);
        
        res.json({ message: 'Deal deleted successfully' });
        
    } catch (error) {
        console.error('Error deleting deal:', error);
        res.status(500).json({ error: 'Failed to delete deal' });
    }
});

module.exports = router;