const express = require('express');
const router = express.Router();
const db = require('../config/db');
const authSupplier = require('../middleware/authSupplier');
const bcrypt = require('bcrypt');

// ------------------------
// Authenticated Supplier Routes (Protected)
// ------------------------

// Get supplier's own profile
router.get('/profile', authSupplier, async (req, res) => {
    try {
        const supplierId = req.supplier.supplierId;
        
        const query = `
            SELECT s.*, 
                   array_agg(sc.city_id) FILTER (WHERE sc.city_id IS NOT NULL) as city_ids,
                   array_agg(c.name) FILTER (WHERE c.name IS NOT NULL) as city_names
            FROM suppliers s
            LEFT JOIN supplier_cities sc ON s.id = sc.supplier_id
            LEFT JOIN cities c ON sc.city_id = c.id
            WHERE s.id = $1
            GROUP BY s.id
        `;
        
        const result = await db.query(query, [supplierId]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Supplier not found' });
        }
        
        const supplier = result.rows[0];
        delete supplier.password_hash; // Remove sensitive data
        
        res.json(supplier);
        
    } catch (error) {
        console.error('Error fetching supplier profile:', error);
        res.status(500).json({ error: 'Failed to fetch profile' });
    }
});

// Get supplier's cities
router.get('/cities', authSupplier, async (req, res) => {
    try {
        const supplierId = req.supplier.supplierId;
        
        const query = `
            SELECT sc.*, c.name as city_name
            FROM supplier_cities sc
            JOIN cities c ON sc.city_id = c.id
            WHERE sc.supplier_id = $1
            ORDER BY c.name ASC
        `;
        
        const result = await db.query(query, [supplierId]);
        res.json(result.rows);
        
    } catch (error) {
        console.error('Error fetching supplier cities:', error);
        res.status(500).json({ error: 'Failed to fetch cities' });
    }
});

// Update supplier's cities
router.put('/cities', authSupplier, async (req, res) => {
    try {
        const supplierId = req.supplier.supplierId;
        const { city_ids } = req.body;
        
        if (!Array.isArray(city_ids)) {
            return res.status(400).json({ error: 'city_ids must be an array' });
        }
        
        const client = await db.pool.connect();
        
        try {
            await client.query('BEGIN');
            
            // Remove existing city associations
            await client.query('DELETE FROM supplier_cities WHERE supplier_id = $1', [supplierId]);
            
            // Add new city associations
            if (city_ids.length > 0) {
                const values = city_ids.map((cityId, index) => 
                    `($1, $${index + 2})`
                ).join(', ');
                
                const insertQuery = `
                    INSERT INTO supplier_cities (supplier_id, city_id)
                    VALUES ${values}
                `;
                
                await client.query(insertQuery, [supplierId, ...city_ids]);
            }
            
            await client.query('COMMIT');
            res.json({ message: 'Cities updated successfully' });
            
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
        
    } catch (error) {
        console.error('Error updating supplier cities:', error);
        res.status(500).json({ error: 'Failed to update cities' });
    }
});

// Get supplier's products with pagination
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

// Create new product
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

// Update product
router.put('/products/:id', authSupplier, async (req, res) => {
    try {
        const { id } = req.params;
        const supplierId = req.supplier.supplierId;
        const {
            name, standardized_name_input, description, price, discount_price,
            category, image_url, is_on_sale, stock_level
        } = req.body;

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

// Delete product
router.delete('/products/:id', authSupplier, async (req, res) => {
    try {
        const { id } = req.params;
        const supplierId = req.supplier.supplierId;

        const verifyQuery = 'SELECT id FROM products WHERE id = $1 AND supplier_id = $2';
        const verifyResult = await db.query(verifyQuery, [id, supplierId]);

        if (verifyResult.rows.length === 0) {
            return res.status(404).json({ error: 'Product not found or not owned by you' });
        }

        const orderCheckQuery = 'SELECT COUNT(*) as order_count FROM order_items WHERE product_id = $1';
        const orderCheckResult = await db.query(orderCheckQuery, [id]);

        if (parseInt(orderCheckResult.rows[0].order_count) > 0) {
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

// Bulk update product stock
router.put('/products/bulk-stock', authSupplier, async (req, res) => {
    try {
        const supplierId = req.supplier.supplierId;
        const { updates } = req.body;
        
        if (!Array.isArray(updates) || updates.length === 0) {
            return res.status(400).json({ error: 'Updates array is required' });
        }
        
        const client = await db.pool.connect();
        
        try {
            await client.query('BEGIN');
            
            for (const update of updates) {
                const { id, stock_level } = update;
                
                // Verify product belongs to this supplier
                const verifyQuery = 'SELECT id FROM products WHERE id = $1 AND supplier_id = $2';
                const verifyResult = await client.query(verifyQuery, [id, supplierId]);
                
                if (verifyResult.rows.length === 0) {
                    await client.query('ROLLBACK');
                    return res.status(404).json({ error: `Product ${id} not found or not owned by you` });
                }
                
                // Update stock level
                await client.query(
                    'UPDATE products SET stock_level = $1, updated_at = NOW() WHERE id = $2',
                    [stock_level, id]
                );
            }
            
            await client.query('COMMIT');
            res.json({ message: 'Stock levels updated successfully', updated_count: updates.length });
            
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
        
    } catch (error) {
        console.error('Error bulk updating stock:', error);
        res.status(500).json({ error: 'Failed to update stock levels' });
    }
});

// Get supplier stats
router.get('/stats', authSupplier, async (req, res) => {
    try {
        const supplierId = req.supplier.supplierId;
        
        const statsQuery = `
            SELECT 
                COUNT(DISTINCT p.id) as total_products,
                COUNT(DISTINCT CASE WHEN p.stock_level > 0 THEN p.id END) as in_stock_products,
                COUNT(DISTINCT CASE WHEN p.stock_level = 0 THEN p.id END) as out_of_stock_products,
                COUNT(DISTINCT CASE WHEN p.is_on_sale = true THEN p.id END) as on_sale_products,
                COUNT(DISTINCT CASE WHEN o.order_date >= CURRENT_DATE - INTERVAL '30 days' THEN o.id END) as orders_this_month,
                COALESCE(SUM(CASE WHEN o.order_date >= CURRENT_DATE - INTERVAL '30 days' THEN oi.quantity * oi.price_at_time_of_order END), 0) as sales_this_month
            FROM products p
            LEFT JOIN order_items oi ON p.id = oi.product_id
            LEFT JOIN orders o ON oi.order_id = o.id AND o.status NOT IN ('cancelled')
            WHERE p.supplier_id = $1
        `;
        
        const result = await db.query(statsQuery, [supplierId]);
        const stats = result.rows[0];
        
        // Convert string numbers to integers/floats
        Object.keys(stats).forEach(key => {
            if (key.includes('count') || key.includes('products') || key.includes('orders')) {
                stats[key] = parseInt(stats[key]) || 0;
            } else if (key.includes('sales')) {
                stats[key] = parseFloat(stats[key]) || 0;
            }
        });
        
        res.json(stats);
        
    } catch (error) {
        console.error('Error fetching supplier stats:', error);
        res.status(500).json({ error: 'Failed to fetch stats' });
    }
});

// Get supplier's orders with items
router.get('/orders', authSupplier, async (req, res) => {
    try {
        const supplierId = req.supplier.supplierId;
        const { page = 1, limit = 20, status } = req.query;
        const offset = (parseInt(page) - 1) * parseInt(limit);
        
        let whereClause = 'WHERE p.supplier_id = $1';
        const queryParams = [supplierId];
        let paramIndex = 2;
        
        if (status && status !== 'all') {
            whereClause += ` AND o.status = $${paramIndex}`;
            queryParams.push(status);
            paramIndex++;
        }
        
        const query = `
            SELECT 
                o.id as order_id,
                o.user_id,
                o.total_amount,
                o.order_date,
                o.status as order_status,
                o.delivery_status,
                up.full_name as customer_name,
                up.phone_number as customer_phone,
                up.address_line1 as customer_address1,
                up.address_line2 as customer_address2,
                up.city as customer_city,
                json_agg(
                    json_build_object(
                        'order_item_id', oi.id,
                        'product_id', oi.product_id,
                        'product_name', p.name,
                        'product_image_url', p.image_url,
                        'quantity', oi.quantity,
                        'price_at_time_of_order', oi.price_at_time_of_order,
                        'supplier_item_status', oi.supplier_item_status,
                        'delivery_item_status', oi.delivery_item_status
                    )
                ) as items_for_this_supplier,
                SUM(oi.quantity * oi.price_at_time_of_order) as supplier_order_value
            FROM orders o
            JOIN order_items oi ON o.id = oi.order_id
            JOIN products p ON oi.product_id = p.id
            LEFT JOIN user_profiles up ON o.user_id = up.user_id
            ${whereClause}
            GROUP BY o.id, o.user_id, o.total_amount, o.order_date, o.status, o.delivery_status,
                     up.full_name, up.phone_number, up.address_line1, up.address_line2, up.city
            ORDER BY o.order_date DESC
            LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
        `;
        
        queryParams.push(parseInt(limit), offset);
        
        const result = await db.query(query, queryParams);
        
        // Get total count
        const countQuery = `
            SELECT COUNT(DISTINCT o.id) as total
            FROM orders o
            JOIN order_items oi ON o.id = oi.order_id
            JOIN products p ON oi.product_id = p.id
            ${whereClause}
        `;
        
        const countResult = await db.query(countQuery, queryParams.slice(0, -2));
        const totalItems = parseInt(countResult.rows[0].total);
        
        res.json({
            items: result.rows,
            currentPage: parseInt(page),
            totalPages: Math.ceil(totalItems / parseInt(limit)),
            totalItems
        });
        
    } catch (error) {
        console.error('Error fetching supplier orders:', error);
        res.status(500).json({ error: 'Failed to fetch orders' });
    }
});

// Get supplier's delivery agents
router.get('/delivery-agents', authSupplier, async (req, res) => {
    try {
        const supplierId = req.supplier.supplierId;
        
        const query = `
            SELECT 
                id, full_name, phone_number, email, telegram_user_id, 
                is_active, created_at, updated_at
            FROM delivery_agents
            WHERE supplier_id = $1
            ORDER BY created_at DESC
        `;
        
        const result = await db.query(query, [supplierId]);
        res.json({ items: result.rows });
        
    } catch (error) {
        console.error('Error fetching delivery agents:', error);
        res.status(500).json({ error: 'Failed to fetch delivery agents' });
    }
});

// Create delivery agent
router.post('/delivery-agents', authSupplier, async (req, res) => {
    try {
        const supplierId = req.supplier.supplierId;
        const { full_name, phone_number, email, telegram_user_id, password, is_active = true } = req.body;
        
        if (!full_name || !phone_number || !password) {
            return res.status(400).json({ error: 'Full name, phone number, and password are required' });
        }
        
        // Check if phone number already exists
        const existingQuery = 'SELECT id FROM delivery_agents WHERE phone_number = $1';
        const existingResult = await db.query(existingQuery, [phone_number]);
        
        if (existingResult.rows.length > 0) {
            return res.status(409).json({ error: 'Phone number already exists' });
        }
        
        // Hash password
        const passwordHash = await bcrypt.hash(password, 10);
        
        const insertQuery = `
            INSERT INTO delivery_agents (
                supplier_id, full_name, phone_number, email, 
                telegram_user_id, password_hash, is_active
            ) VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING id, full_name, phone_number, email, telegram_user_id, is_active, created_at
        `;
        
        const result = await db.query(insertQuery, [
            supplierId, full_name, phone_number, email || null,
            telegram_user_id || null, passwordHash, is_active
        ]);
        
        res.status(201).json(result.rows[0]);
        
    } catch (error) {
        console.error('Error creating delivery agent:', error);
        res.status(500).json({ error: 'Failed to create delivery agent' });
    }
});

// Update delivery agent
router.put('/delivery-agents/:id', authSupplier, async (req, res) => {
    try {
        const { id } = req.params;
        const supplierId = req.supplier.supplierId;
        const { full_name, phone_number, email, telegram_user_id, is_active } = req.body;
        
        // Verify agent belongs to this supplier
        const verifyQuery = 'SELECT id FROM delivery_agents WHERE id = $1 AND supplier_id = $2';
        const verifyResult = await db.query(verifyQuery, [id, supplierId]);
        
        if (verifyResult.rows.length === 0) {
            return res.status(404).json({ error: 'Delivery agent not found or not owned by you' });
        }
        
        const updateFields = [];
        const updateValues = [];
        let paramIndex = 1;
        
        if (full_name !== undefined) {
            updateFields.push(`full_name = $${paramIndex}`);
            updateValues.push(full_name);
            paramIndex++;
        }
        
        if (phone_number !== undefined) {
            updateFields.push(`phone_number = $${paramIndex}`);
            updateValues.push(phone_number);
            paramIndex++;
        }
        
        if (email !== undefined) {
            updateFields.push(`email = $${paramIndex}`);
            updateValues.push(email || null);
            paramIndex++;
        }
        
        if (telegram_user_id !== undefined) {
            updateFields.push(`telegram_user_id = $${paramIndex}`);
            updateValues.push(telegram_user_id || null);
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
            UPDATE delivery_agents 
            SET ${updateFields.join(', ')}
            WHERE id = $${paramIndex}
            RETURNING id, full_name, phone_number, email, telegram_user_id, is_active, updated_at
        `;
        
        const result = await db.query(updateQuery, updateValues);
        res.json(result.rows[0]);
        
    } catch (error) {
        console.error('Error updating delivery agent:', error);
        res.status(500).json({ error: 'Failed to update delivery agent' });
    }
});

// Delete delivery agent
router.delete('/delivery-agents/:id', authSupplier, async (req, res) => {
    try {
        const { id } = req.params;
        const supplierId = req.supplier.supplierId;
        
        // Verify agent belongs to this supplier
        const verifyQuery = 'SELECT id FROM delivery_agents WHERE id = $1 AND supplier_id = $2';
        const verifyResult = await db.query(verifyQuery, [id, supplierId]);
        
        if (verifyResult.rows.length === 0) {
            return res.status(404).json({ error: 'Delivery agent not found or not owned by you' });
        }
        
        // Check if agent has active deliveries
        const activeDeliveriesQuery = `
            SELECT COUNT(*) as active_count
            FROM order_items
            WHERE assigned_delivery_agent_id = $1 
            AND delivery_item_status IN ('assigned_to_agent', 'out_for_delivery')
        `;
        
        const activeResult = await db.query(activeDeliveriesQuery, [id]);
        
        if (parseInt(activeResult.rows[0].active_count) > 0) {
            return res.status(400).json({ 
                error: 'Cannot delete agent with active deliveries. Deactivate instead.' 
            });
        }
        
        const deleteQuery = 'DELETE FROM delivery_agents WHERE id = $1';
        await db.query(deleteQuery, [id]);
        
        res.json({ message: 'Delivery agent deleted successfully' });
        
    } catch (error) {
        console.error('Error deleting delivery agent:', error);
        res.status(500).json({ error: 'Failed to delete delivery agent' });
    }
});

// Toggle delivery agent active status
router.put('/delivery-agents/:id/toggle-active', authSupplier, async (req, res) => {
    try {
        const { id } = req.params;
        const supplierId = req.supplier.supplierId;
        
        // Verify agent belongs to this supplier
        const verifyQuery = 'SELECT id, is_active FROM delivery_agents WHERE id = $1 AND supplier_id = $2';
        const verifyResult = await db.query(verifyQuery, [id, supplierId]);
        
        if (verifyResult.rows.length === 0) {
            return res.status(404).json({ error: 'Delivery agent not found or not owned by you' });
        }
        
        const updateQuery = `
            UPDATE delivery_agents 
            SET is_active = NOT is_active, updated_at = NOW()
            WHERE id = $1
            RETURNING id, full_name, phone_number, email, telegram_user_id, is_active, updated_at
        `;
        
        const result = await db.query(updateQuery, [id]);
        res.json(result.rows[0]);
        
    } catch (error) {
        console.error('Error toggling delivery agent status:', error);
        res.status(500).json({ error: 'Failed to toggle agent status' });
    }
});

// ------------------------
// Public Supplier Routes
// ------------------------

// Get all suppliers (public)
router.get('/', async (req, res) => {
    try {
        const { cityId } = req.query;

        let query = `
            SELECT 
                s.*,
                COUNT(p.id) as product_count
            FROM suppliers s
            LEFT JOIN products p ON s.id = p.supplier_id
            WHERE s.is_active = true
        `;

        const queryParams = [];

        if (cityId) {
            query += ' AND s.id IN (SELECT supplier_id FROM supplier_cities WHERE city_id = $1)';
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

// Get supplier details (public)
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const supplierQuery = 'SELECT * FROM suppliers WHERE id = $1 AND is_active = true';
        const supplierResult = await db.query(supplierQuery, [id]);

        if (supplierResult.rows.length === 0) {
            return res.status(404).json({ error: 'Supplier not found' });
        }

        const productsQuery = `
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

module.exports = router;