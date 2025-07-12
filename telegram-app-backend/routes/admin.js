// routes/admin.js
const express = require('express');
const router = express.Router();
const db = require('../config/db');
const authAdmin = require('../middleware/authAdmin');
const bcrypt = require('bcrypt');

// Get all suppliers (admin only)
router.get('/suppliers', authAdmin, async (req, res) => {
    try {
        const query = `
            SELECT 
                s.*,
                COUNT(p.id) as product_count,
                COUNT(CASE WHEN o.status = 'pending' THEN 1 END) as pending_orders
            FROM suppliers s
            LEFT JOIN products p ON s.id = p.supplier_id AND p.is_active = true
            LEFT JOIN order_items oi ON p.id = oi.product_id
            LEFT JOIN orders o ON oi.order_id = o.id AND o.status = 'pending'
            GROUP BY s.id
            ORDER BY s.created_at DESC
        `;
        
        const result = await db.query(query);
        res.json({ items: result.rows });
        
    } catch (error) {
        console.error('Error fetching suppliers for admin:', error);
        res.status(500).json({ error: 'Failed to fetch suppliers' });
    }
});

// Create new supplier (admin only)
router.post('/suppliers', authAdmin, async (req, res) => {
    try {
        const {
            name, email, password, category, location, 
            rating, description, image_url, is_active = true
        } = req.body;
        
        if (!name || !email || !password || !category) {
            return res.status(400).json({ error: 'Name, email, password, and category are required' });
        }
        
        // Check if email already exists
        const existingQuery = 'SELECT id FROM suppliers WHERE email = $1';
        const existingResult = await db.query(existingQuery, [email.toLowerCase()]);
        
        if (existingResult.rows.length > 0) {
            return res.status(409).json({ error: 'Email already exists' });
        }
        
        // Hash password
        const passwordHash = await bcrypt.hash(password, 10);
        
        const insertQuery = `
            INSERT INTO suppliers (
                name, email, password_hash, category, location, 
                rating, description, image_url, is_active
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            RETURNING *
        `;
        
        const result = await db.query(insertQuery, [
            name, email.toLowerCase(), passwordHash, category, location,
            rating, description, image_url, is_active
        ]);
        
        // Remove password_hash from response
        const supplier = result.rows[0];
        delete supplier.password_hash;
        
        res.status(201).json(supplier);
        
    } catch (error) {
        console.error('Error creating supplier:', error);
        res.status(500).json({ error: 'Failed to create supplier' });
    }
});

// Update supplier (admin only)
router.put('/suppliers/:id', authAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const {
            name, email, category, location, 
            rating, description, image_url, is_active
        } = req.body;
        
        const updateFields = [];
        const updateValues = [];
        let paramIndex = 1;
        
        if (name !== undefined) {
            updateFields.push(`name = $${paramIndex}`);
            updateValues.push(name);
            paramIndex++;
        }
        
        if (email !== undefined) {
            updateFields.push(`email = $${paramIndex}`);
            updateValues.push(email.toLowerCase());
            paramIndex++;
        }
        
        if (category !== undefined) {
            updateFields.push(`category = $${paramIndex}`);
            updateValues.push(category);
            paramIndex++;
        }
        
        if (location !== undefined) {
            updateFields.push(`location = $${paramIndex}`);
            updateValues.push(location);
            paramIndex++;
        }
        
        if (rating !== undefined) {
            updateFields.push(`rating = $${paramIndex}`);
            updateValues.push(rating);
            paramIndex++;
        }
        
        if (description !== undefined) {
            updateFields.push(`description = $${paramIndex}`);
            updateValues.push(description);
            paramIndex++;
        }
        
        if (image_url !== undefined) {
            updateFields.push(`image_url = $${paramIndex}`);
            updateValues.push(image_url);
            paramIndex++;
        }
        
        if (is_active !== undefined) {
            updateFields.push(`is_active = $${paramIndex}`);
            updateValues.push(is_active);
            paramIndex++;
        }
        
        if (updateFields.length === 0) {
            return res.status(400).json({ error: 'No fields to update' });
        }
        
        updateFields.push(`updated_at = NOW()`);
        updateValues.push(id);
        
        const updateQuery = `
            UPDATE suppliers 
            SET ${updateFields.join(', ')}
            WHERE id = $${paramIndex}
            RETURNING *
        `;
        
        const result = await db.query(updateQuery, updateValues);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Supplier not found' });
        }
        
        // Remove password_hash from response
        const supplier = result.rows[0];
        delete supplier.password_hash;
        
        res.json(supplier);
        
    } catch (error) {
        console.error('Error updating supplier:', error);
        res.status(500).json({ error: 'Failed to update supplier' });
    }
});

// Toggle supplier active status (admin only)
router.put('/suppliers/:id/toggle-active', authAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        
        const query = `
            UPDATE suppliers 
            SET is_active = NOT is_active, updated_at = NOW()
            WHERE id = $1
            RETURNING *
        `;
        
        const result = await db.query(query, [id]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Supplier not found' });
        }
        
        // Remove password_hash from response
        const supplier = result.rows[0];
        delete supplier.password_hash;
        
        res.json(supplier);
        
    } catch (error) {
        console.error('Error toggling supplier status:', error);
        res.status(500).json({ error: 'Failed to toggle supplier status' });
    }
});

// Delete supplier (admin only)
router.delete('/suppliers/:id', authAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        
        // Check if supplier has products or orders
        const checkQuery = `
            SELECT 
                COUNT(p.id) as product_count,
                COUNT(oi.id) as order_count
            FROM suppliers s
            LEFT JOIN products p ON s.id = p.supplier_id
            LEFT JOIN order_items oi ON p.id = oi.product_id
            WHERE s.id = $1
        `;
        
        const checkResult = await db.query(checkQuery, [id]);
        const { product_count, order_count } = checkResult.rows[0];
        
        if (parseInt(product_count) > 0 || parseInt(order_count) > 0) {
            return res.status(400).json({ 
                error: 'Cannot delete supplier with existing products or orders. Deactivate instead.' 
            });
        }
        
        const deleteQuery = 'DELETE FROM suppliers WHERE id = $1 RETURNING id';
        const result = await db.query(deleteQuery, [id]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Supplier not found' });
        }
        
        res.json({ message: 'Supplier deleted successfully' });
        
    } catch (error) {
        console.error('Error deleting supplier:', error);
        res.status(500).json({ error: 'Failed to delete supplier' });
    }
});

// Get featured items definitions (admin only)
router.get('/featured-items-definitions', authAdmin, async (req, res) => {
    try {
        const query = `
            SELECT 
                fd.*,
                CASE 
                    WHEN fd.item_type = 'product' THEN p.name
                    WHEN fd.item_type = 'deal' THEN d.title
                    WHEN fd.item_type = 'supplier' THEN s.name
                END as original_item_name
            FROM featured_items_definitions fd
            LEFT JOIN products p ON fd.item_type = 'product' AND fd.item_id = p.id
            LEFT JOIN deals d ON fd.item_type = 'deal' AND fd.item_id = d.id
            LEFT JOIN suppliers s ON fd.item_type = 'supplier' AND fd.item_id = s.id
            ORDER BY fd.display_order ASC, fd.created_at DESC
        `;
        
        const result = await db.query(query);
        res.json({ items: result.rows });
        
    } catch (error) {
        console.error('Error fetching featured items definitions:', error);
        res.status(500).json({ error: 'Failed to fetch featured items definitions' });
    }
});

// Create featured item (admin only)
router.post('/featured-items', authAdmin, async (req, res) => {
    try {
        const {
            item_type, item_id, display_order = 0, custom_title,
            custom_description, custom_image_url, is_active = true,
            active_from, active_until
        } = req.body;
        
        if (!item_type || !item_id) {
            return res.status(400).json({ error: 'Item type and item ID are required' });
        }
        
        const insertQuery = `
            INSERT INTO featured_items_definitions (
                item_type, item_id, display_order, custom_title,
                custom_description, custom_image_url, is_active,
                active_from, active_until
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            RETURNING *
        `;
        
        const result = await db.query(insertQuery, [
            item_type, item_id, display_order, custom_title,
            custom_description, custom_image_url, is_active,
            active_from, active_until
        ]);
        
        res.status(201).json(result.rows[0]);
        
    } catch (error) {
        console.error('Error creating featured item:', error);
        res.status(500).json({ error: 'Failed to create featured item' });
    }
});

// Update featured item (admin only)
router.put('/featured-items-definitions/:id', authAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const {
            item_type, item_id, display_order, custom_title,
            custom_description, custom_image_url, is_active,
            active_from, active_until
        } = req.body;
        
        const updateFields = [];
        const updateValues = [];
        let paramIndex = 1;
        
        if (item_type !== undefined) {
            updateFields.push(`item_type = $${paramIndex}`);
            updateValues.push(item_type);
            paramIndex++;
        }
        
        if (item_id !== undefined) {
            updateFields.push(`item_id = $${paramIndex}`);
            updateValues.push(item_id);
            paramIndex++;
        }
        
        if (display_order !== undefined) {
            updateFields.push(`display_order = $${paramIndex}`);
            updateValues.push(display_order);
            paramIndex++;
        }
        
        if (custom_title !== undefined) {
            updateFields.push(`custom_title = $${paramIndex}`);
            updateValues.push(custom_title);
            paramIndex++;
        }
        
        if (custom_description !== undefined) {
            updateFields.push(`custom_description = $${paramIndex}`);
            updateValues.push(custom_description);
            paramIndex++;
        }
        
        if (custom_image_url !== undefined) {
            updateFields.push(`custom_image_url = $${paramIndex}`);
            updateValues.push(custom_image_url);
            paramIndex++;
        }
        
        if (is_active !== undefined) {
            updateFields.push(`is_active = $${paramIndex}`);
            updateValues.push(is_active);
            paramIndex++;
        }
        
        if (active_from !== undefined) {
            updateFields.push(`active_from = $${paramIndex}`);
            updateValues.push(active_from);
            paramIndex++;
        }
        
        if (active_until !== undefined) {
            updateFields.push(`active_until = $${paramIndex}`);
            updateValues.push(active_until);
            paramIndex++;
        }
        
        if (updateFields.length === 0) {
            return res.status(400).json({ error: 'No fields to update' });
        }
        
        updateFields.push(`updated_at = NOW()`);
        updateValues.push(id);
        
        const updateQuery = `
            UPDATE featured_items_definitions 
            SET ${updateFields.join(', ')}
            WHERE id = $${paramIndex}
            RETURNING *
        `;
        
        const result = await db.query(updateQuery, updateValues);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Featured item not found' });
        }
        
        res.json(result.rows[0]);
        
    } catch (error) {
        console.error('Error updating featured item:', error);
        res.status(500).json({ error: 'Failed to update featured item' });
    }
});

// Delete featured item (admin only)
router.delete('/featured-items-definitions/:id', authAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        
        const deleteQuery = 'DELETE FROM featured_items_definitions WHERE id = $1 RETURNING id';
        const result = await db.query(deleteQuery, [id]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Featured item not found' });
        }
        
        res.json({ message: 'Featured item deleted successfully' });
        
    } catch (error) {
        console.error('Error deleting featured item:', error);
        res.status(500).json({ error: 'Failed to delete featured item' });
    }
});

module.exports = router;