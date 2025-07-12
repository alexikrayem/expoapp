// routes/suppliers.js
const express = require('express');
const router = express.Router();
const db = require('../config/db');
const authSupplier = require('../middleware/authSupplier');

// Get suppliers (with optional city filter)
router.get('/', async (req, res) => {
    try {
        const { cityId } = req.query;
        
        let query = `
            SELECT 
                s.*,
                COUNT(p.id) as product_count
            FROM suppliers s
            LEFT JOIN products p ON s.id = p.supplier_id AND p.is_active = true
            WHERE s.is_active = true
        `;
        
        const queryParams = [];
        
        if (cityId) {
            query += ' AND s.city_id = $1';
            queryParams.push(cityId);
        }
        
        query += ' GROUP BY s.id ORDER BY s.name ASC';
        
        const result = await db.query(query, queryParams);
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching suppliers:', error);
        res.status(500).json({ error: 'Failed to fetch suppliers' });
    }
});

// Get supplier details with products
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        // Get supplier info
        const supplierQuery = 'SELECT * FROM suppliers WHERE id = $1 AND is_active = true';
        const supplierResult = await db.query(supplierQuery, [id]);
        
        if (supplierResult.rows.length === 0) {
            return res.status(404).json({ error: 'Supplier not found' });
        }
        
        // Get supplier's products (limited for preview)
        const productsQuery = `
            SELECT 
                p.*,
                CASE 
                    WHEN p.is_on_sale = true AND p.discount_price IS NOT NULL 
                    THEN p.discount_price 
                    ELSE p.price 
                END as effective_selling_price
            FROM products p
            WHERE p.supplier_id = $1 AND p.is_active = true
            ORDER BY p.created_at DESC
            LIMIT 6
        `;
        
        const productsResult = await db.query(productsQuery, [id]);
        
        const supplier = supplierResult.rows[0];
        supplier.products = productsResult.rows;
        supplier.hasMoreProducts = productsResult.rows.length === 6;
        
        res.json(supplier);
    } catch (error) {
        console.error('Error fetching supplier details:', error);
        res.status(500).json({ error: 'Failed to fetch supplier details' });
    }
});

// Get supplier's own products (authenticated)
router.get('/products', authSupplier, async (req, res) => {
    try {
        const supplierId = req.supplier.supplierId;
        const { page = 1, limit = 20 } = req.query;
        
        const offset = (parseInt(page) - 1) * parseInt(limit);
        
        const query = `
            SELECT 
                p.*,
                CASE 
                    WHEN p.is_on_sale = true AND p.discount_price IS NOT NULL 
                    THEN p.discount_price 
                    ELSE p.price 
                END as effective_selling_price
            FROM products p
            WHERE p.supplier_id = $1
            ORDER BY p.created_at DESC
            LIMIT $2 OFFSET $3
        `;
        
        const result = await db.query(query, [supplierId, parseInt(limit), offset]);
        res.json(result.rows);
        
    } catch (error) {
        console.error('Error fetching supplier products:', error);
        res.status(500).json({ error: 'Failed to fetch products' });
    }
});

// Create new product (authenticated supplier)
router.post('/products', authSupplier, async (req, res) => {
    try {
        const supplierId = req.supplier.supplierId;
        const {
            name, standardized_name_input, description, price, discount_price,
            category, image_url, is_on_sale, stock_level
        } = req.body;
        
        if (!name || !standardized_name_input || !price || !category) {
            return res.status(400).json({ error: 'Name, standardized name, price, and category are required' });
        }
        
        const insertQuery = `
            INSERT INTO products (
                name, standardized_name_input, description, price, discount_price,
                category, image_url, is_on_sale, stock_level, supplier_id
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            RETURNING *
        `;
        
        const result = await db.query(insertQuery, [
            name, standardized_name_input, description, parseFloat(price),
            discount_price ? parseFloat(discount_price) : null,
            category, image_url, Boolean(is_on_sale), parseInt(stock_level) || 0,
            supplierId
        ]);
        
        res.status(201).json(result.rows[0]);
        
    } catch (error) {
        console.error('Error creating product:', error);
        res.status(500).json({ error: 'Failed to create product' });
    }
});

// Update product (authenticated supplier)
router.put('/products/:id', authSupplier, async (req, res) => {
    try {
        const { id } = req.params;
        const supplierId = req.supplier.supplierId;
        const {
            name, standardized_name_input, description, price, discount_price,
            category, image_url, is_on_sale, stock_level
        } = req.body;
        
        // Verify product belongs to this supplier
        const verifyQuery = 'SELECT id FROM products WHERE id = $1 AND supplier_id = $2';
        const verifyResult = await db.query(verifyQuery, [id, supplierId]);
        
        if (verifyResult.rows.length === 0) {
            return res.status(404).json({ error: 'Product not found or not owned by you' });
        }
        
        const updateFields = [];
        const updateValues = [];
        let paramIndex = 1;
        
        if (name !== undefined) {
            updateFields.push(`name = $${paramIndex}`);
            updateValues.push(name);
            paramIndex++;
        }
        
        if (standardized_name_input !== undefined) {
            updateFields.push(`standardized_name_input = $${paramIndex}`);
            updateValues.push(standardized_name_input);
            paramIndex++;
        }
        
        if (description !== undefined) {
            updateFields.push(`description = $${paramIndex}`);
            updateValues.push(description);
            paramIndex++;
        }
        
        if (price !== undefined) {
            updateFields.push(`price = $${paramIndex}`);
            updateValues.push(parseFloat(price));
            paramIndex++;
        }
        
        if (discount_price !== undefined) {
            updateFields.push(`discount_price = $${paramIndex}`);
            updateValues.push(discount_price ? parseFloat(discount_price) : null);
            paramIndex++;
        }
        
        if (category !== undefined) {
            updateFields.push(`category = $${paramIndex}`);
            updateValues.push(category);
            paramIndex++;
        }
        
        if (image_url !== undefined) {
            updateFields.push(`image_url = $${paramIndex}`);
            updateValues.push(image_url);
            paramIndex++;
        }
        
        if (is_on_sale !== undefined) {
            updateFields.push(`is_on_sale = $${paramIndex}`);
            updateValues.push(Boolean(is_on_sale));
            paramIndex++;
        }
        
        if (stock_level !== undefined) {
            updateFields.push(`stock_level = $${paramIndex}`);
            updateValues.push(parseInt(stock_level) || 0);
            paramIndex++;
        }
        
        if (updateFields.length === 0) {
            return res.status(400).json({ error: 'No fields to update' });
        }
        
        updateFields.push(`updated_at = NOW()`);
        updateValues.push(id);
        
        const updateQuery = `
            UPDATE products 
            SET ${updateFields.join(', ')}
            WHERE id = $${paramIndex}
            RETURNING *
        `;
        
        const result = await db.query(updateQuery, updateValues);
        res.json(result.rows[0]);
        
    } catch (error) {
        console.error('Error updating product:', error);
        res.status(500).json({ error: 'Failed to update product' });
    }
});

// Delete product (authenticated supplier)
router.delete('/products/:id', authSupplier, async (req, res) => {
    try {
        const { id } = req.params;
        const supplierId = req.supplier.supplierId;
        
        // Verify product belongs to this supplier
        const verifyQuery = 'SELECT id FROM products WHERE id = $1 AND supplier_id = $2';
        const verifyResult = await db.query(verifyQuery, [id, supplierId]);
        
        if (verifyResult.rows.length === 0) {
            return res.status(404).json({ error: 'Product not found or not owned by you' });
        }
        
        // Check if product has orders
        const orderCheckQuery = 'SELECT COUNT(*) as order_count FROM order_items WHERE product_id = $1';
        const orderCheckResult = await db.query(orderCheckQuery, [id]);
        
        if (parseInt(orderCheckResult.rows[0].order_count) > 0) {
            // Don't delete, just deactivate
            const deactivateQuery = 'UPDATE products SET is_active = false WHERE id = $1 RETURNING *';
            const result = await db.query(deactivateQuery, [id]);
            return res.json({ message: 'Product deactivated (has existing orders)', product: result.rows[0] });
        }
        
        const deleteQuery = 'DELETE FROM products WHERE id = $1';
        await db.query(deleteQuery, [id]);
        
        res.json({ message: 'Product deleted successfully' });
        
    } catch (error) {
        console.error('Error deleting product:', error);
        res.status(500).json({ error: 'Failed to delete product' });
    }
});

module.exports = router;