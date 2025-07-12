// routes/products.js (COMPLETE AND CORRECTED)
const express = require('express');
const router = express.Router();
const db = require('../config/db');

// Get all products with filtering, search, and pagination
router.get('/', async (req, res) => {
    try {
        const {
            page = 1,
            limit = 12,
            cityId,
            category,
            searchTerm,
            minPrice,
            maxPrice,
            onSale
        } = req.query;

        const offset = (parseInt(page) - 1) * parseInt(limit);
        
        let whereConditions = ['p.is_active = true', 's.is_active = true'];
        let queryParams = [];
        let paramIndex = 1;

        if (cityId) {
            whereConditions.push(`s.city_id = $${paramIndex++}`);
            queryParams.push(cityId);
        }

        if (category && category !== 'all') {
            whereConditions.push(`p.category ILIKE $${paramIndex++}`);
            queryParams.push(category); // No need for % signs if category name is exact
        }

        if (searchTerm) {
            whereConditions.push(`(p.name ILIKE $${paramIndex} OR p.description ILIKE $${paramIndex} OR s.name ILIKE $${paramIndex})`);
            queryParams.push(`%${searchTerm}%`);
            paramIndex++;
        }

        if (minPrice) {
            whereConditions.push(`p.price >= $${paramIndex++}`);
            queryParams.push(parseFloat(minPrice));
        }

        if (maxPrice) {
            whereConditions.push(`p.price <= $${paramIndex++}`);
            queryParams.push(parseFloat(maxPrice));
        }

        if (onSale === 'true') {
            whereConditions.push('p.is_on_sale = true AND p.discount_price IS NOT NULL');
        }

        const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

        const productsQuery = `
            SELECT 
                p.*,
                s.name as supplier_name,
                s.location as supplier_location,
                CASE 
                    WHEN p.is_on_sale = true AND p.discount_price IS NOT NULL 
                    THEN p.discount_price 
                    ELSE p.price 
                END as effective_selling_price
            FROM products p
            JOIN suppliers s ON p.supplier_id = s.id
            ${whereClause}
            ORDER BY p.created_at DESC
            LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
        `;

        const productsParams = [...queryParams, parseInt(limit), offset];

        const countQuery = `
            SELECT COUNT(*) as total
            FROM products p
            JOIN suppliers s ON p.supplier_id = s.id
            ${whereClause}
        `;

        const [productsResult, countResult] = await Promise.all([
            db.query(productsQuery, productsParams),
            db.query(countQuery, queryParams) // Use original params for count
        ]);

        const totalItems = parseInt(countResult.rows[0].total);
        const totalPages = Math.ceil(totalItems / parseInt(limit));

        res.json({
            items: productsResult.rows,
            currentPage: parseInt(page),
            totalPages,
            totalItems,
            limit: parseInt(limit)
        });

    } catch (error) {
        console.error('Error fetching products:', error);
        res.status(500).json({ error: 'Failed to fetch products' });
    }
});

// Get product categories for filter options
router.get('/categories', async (req, res) => {
    try {
        const { cityId } = req.query;
        let query = `
            SELECT p.category, COUNT(*) as product_count
            FROM products p
            JOIN suppliers s ON p.supplier_id = s.id
            WHERE p.is_active = true AND s.is_active = true
        `;
        const queryParams = [];
        if (cityId) {
            query += ' AND s.city_id = $1';
            queryParams.push(cityId);
        }
        query += `
            GROUP BY p.category
            HAVING COUNT(*) > 0
            ORDER BY product_count DESC, p.category ASC
        `;
        const result = await db.query(query, queryParams);
        res.json({ categories: result.rows });
    } catch (error) {
        console.error('Error fetching categories:', error);
        res.status(500).json({ error: 'Failed to fetch categories' });
    }
});

// Get products by batch of IDs (for favorites tab)
router.get('/batch', async (req, res) => {
    try {
        const { ids } = req.query;
        if (!ids) return res.json([]);
        const productIds = ids.split(',').map(id => parseInt(id)).filter(id => !isNaN(id));
        if (productIds.length === 0) return res.json([]);

        const placeholders = productIds.map((_, index) => `$${index + 1}`).join(',');
        const query = `
            SELECT 
                p.*, s.name as supplier_name,
                CASE 
                    WHEN p.is_on_sale = true AND p.discount_price IS NOT NULL 
                    THEN p.discount_price ELSE p.price 
                END as effective_selling_price
            FROM products p
            JOIN suppliers s ON p.supplier_id = s.id
            WHERE p.id IN (${placeholders}) AND p.is_active = true
            ORDER BY p.created_at DESC
        `;
        const result = await db.query(query, productIds);
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching products batch:', error);
        res.status(500).json({ error: 'Failed to fetch products' });
    }
});

// ======================================================================
// === THIS IS THE NEW ROUTE WE MOVED FROM favorites.js =================
// ======================================================================
// Get favorite product details with alternatives (used in ProductDetailModal)
router.get('/favorite-details/:productId', async (req, res) => {
    try {
        const { productId } = req.params;
        
        const productQuery = `
            SELECT p.*, s.name as supplier_name,
                   CASE WHEN p.is_on_sale = true AND p.discount_price IS NOT NULL 
                   THEN p.discount_price ELSE p.price END as effective_selling_price
            FROM products p
            JOIN suppliers s ON p.supplier_id = s.id
            WHERE p.id = $1
        `;
        const productResult = await db.query(productQuery, [productId]);
        
        if (productResult.rows.length === 0) {
            return res.status(404).json({ error: 'Product not found' });
        }
        
        const product = productResult.rows[0];
        const isAvailable = product.stock_level > 0 && product.is_active;
        
        let alternatives = [];
        if (!isAvailable && product.standardized_name_input) {
            const alternativesQuery = `
                SELECT p.*, s.name as supplier_name,
                       CASE WHEN p.is_on_sale = true AND p.discount_price IS NOT NULL 
                       THEN p.discount_price ELSE p.price END as effective_selling_price
                FROM products p
                JOIN suppliers s ON p.supplier_id = s.id
                WHERE p.standardized_name_input ILIKE $1 
                  AND p.id != $2 AND p.is_active = true AND p.stock_level > 0
                ORDER BY p.price ASC
                LIMIT 3
            `;
            const alternativesResult = await db.query(alternativesQuery, [product.standardized_name_input, productId]);
            alternatives = alternativesResult.rows;
        }
        
        res.json({
            originalProduct: product,
            isAvailable,
            alternatives
        });
        
    } catch (error) {
        console.error('Error fetching favorite product details:', error);
        res.status(500).json({ error: 'Failed to fetch product details' });
    }
});

// Get individual product by ID
router.get('/:id', async (req, res) => {
    try {
        const productId = parseInt(req.params.id);
        if (isNaN(productId)) return res.status(400).json({ error: 'Invalid product ID' });

        const query = `
            SELECT 
                p.*, s.name as supplier_name,
                CASE WHEN p.is_on_sale = true AND p.discount_price IS NOT NULL 
                THEN p.discount_price ELSE p.price END as effective_selling_price
            FROM products p
            JOIN suppliers s ON p.supplier_id = s.id
            WHERE p.id = $1 AND p.is_active = true
        `;
        const result = await db.query(query, [productId]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Product not found' });
        }
        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error fetching product:', error);
        res.status(500).json({ error: 'Failed to fetch product' });
    }
});


module.exports = router;