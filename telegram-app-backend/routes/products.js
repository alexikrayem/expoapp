// routes/products.js (UPGRADED WITH SMARTER ALTERNATIVES)
const express = require('express');
const router = express.Router();
const db = require('../config/db');

// Get all products with filtering, search, and pagination
router.get('/', async (req, res) => {
    try {
        const { page = 1, limit = 12, cityId, category, searchTerm, minPrice, maxPrice, onSale } = req.query;
        const offset = (parseInt(page) - 1) * parseInt(limit);
        
        let whereConditions = ['s.is_active = true'];
        let queryParams = [];
        let paramIndex = 1;

        if (cityId) {
            whereConditions.push(`s.id IN (SELECT supplier_id FROM supplier_cities WHERE city_id = $${paramIndex++})`);
            queryParams.push(cityId);
        }
        if (category && category !== 'all') {
            whereConditions.push(`p.category = $${paramIndex++}`);
            queryParams.push(category);
        }
        if (searchTerm) {
            whereConditions.push(`(p.name ILIKE $${paramIndex} OR s.name ILIKE $${paramIndex})`);
            queryParams.push(`%${searchTerm}%`);
            paramIndex++;
        }
        if (minPrice) { whereConditions.push(`p.price >= $${paramIndex++}`); queryParams.push(parseFloat(minPrice)); }
        if (maxPrice) { whereConditions.push(`p.price <= $${paramIndex++}`); queryParams.push(parseFloat(maxPrice)); }
        if (onSale === 'true') { whereConditions.push('p.is_on_sale = true'); }

        const whereClause = `WHERE ${whereConditions.join(' AND ')}`;

        const productsQuery = `
            SELECT p.*, s.name as supplier_name,
                   CASE WHEN p.is_on_sale = true AND p.discount_price IS NOT NULL THEN p.discount_price ELSE p.price END as effective_selling_price
            FROM products p
            JOIN suppliers s ON p.supplier_id = s.id
            ${whereClause}
            ORDER BY p.created_at DESC
            LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;

        const countQuery = `SELECT COUNT(*) as total FROM products p JOIN suppliers s ON p.supplier_id = s.id ${whereClause}`;
        
        const [productsResult, countResult] = await Promise.all([
            db.query(productsQuery, [...queryParams, limit, offset]),
            db.query(countQuery, queryParams)
        ]);

        res.json({
            items: productsResult.rows,
            currentPage: parseInt(page),
            totalPages: Math.ceil(parseInt(countResult.rows[0].total) / limit),
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
            WHERE s.is_active = true
        `;
        const queryParams = [];
        if (cityId) {
            query += ` AND s.id IN (SELECT supplier_id FROM supplier_cities WHERE city_id = $1)`;
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
            SELECT p.*, s.name as supplier_name,
                   CASE WHEN p.is_on_sale = true AND p.discount_price IS NOT NULL THEN p.discount_price ELSE p.price END as effective_selling_price
            FROM products p
            JOIN suppliers s ON p.supplier_id = s.id
            WHERE p.id IN (${placeholders}) AND s.is_active = true
        `;
        const result = await db.query(query, productIds);
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching products batch:', error);
        res.status(500).json({ error: 'Failed to fetch products' });
    }
});


// Get favorite product details with alternatives (used in ProductDetailModal)
router.get('/favorite-details/:productId', async (req, res) => {
    try {
        const { productId } = req.params;

        // Step 1: Fetch the main product and its supplier in a single, efficient query.
        const productQuery = `
            SELECT p.*, s.name as supplier_name, s.is_active as supplier_is_active
            FROM products p
            LEFT JOIN suppliers s ON p.supplier_id = s.id
            WHERE p.id = $1
        `;
        const productPromise = db.query(productQuery, [productId]);

        // We will run the product fetch and potentially the alternatives fetch in parallel.
        const [productResult] = await Promise.all([productPromise]);

        if (productResult.rows.length === 0) {
            return res.status(404).json({ error: 'Product not found' });
        }

        const product = productResult.rows[0];
        const isAvailable = product.stock_level > 0 && product.supplier_is_active;

        let alternatives = [];
        // Step 2: If unavailable, fetch alternatives.
        if (!isAvailable) {
            let alternativesQuery = '';
            let alternativesParams = [];

            if (product.master_product_id) {
                alternativesQuery = `
                    SELECT p.*, s.name as supplier_name,
                           CASE WHEN p.is_on_sale AND p.discount_price IS NOT NULL THEN p.discount_price ELSE p.price END as effective_selling_price
                    FROM products p JOIN suppliers s ON p.supplier_id = s.id
                    WHERE p.master_product_id = $1 AND p.id != $2 AND s.is_active = true AND p.stock_level > 0
                    ORDER BY p.price ASC LIMIT 5`;
                alternativesParams = [product.master_product_id, productId];
            } else if (product.standardized_name_input) {
                alternativesQuery = `
                    SELECT p.*, s.name as supplier_name,
                           CASE WHEN p.is_on_sale AND p.discount_price IS NOT NULL THEN p.discount_price ELSE p.price END as effective_selling_price
                    FROM products p JOIN suppliers s ON p.supplier_id = s.id
                    WHERE p.standardized_name_input ILIKE $1 AND p.id != $2 AND s.is_active = true AND p.stock_level > 0
                    ORDER BY p.price ASC LIMIT 3`;
                alternativesParams = [`%${product.standardized_name_input}%`, productId];
            }

            if (alternativesQuery) {
                const alternativesResult = await db.query(alternativesQuery, alternativesParams);
                alternatives = alternativesResult.rows;
            }
        }
        
        const responseData = {
            originalProduct: {
                ...product,
                effective_selling_price: (product.is_on_sale && product.discount_price) ? product.discount_price : product.price
            },
            isAvailable,
            alternatives
        };

        res.json(responseData);
        
    } catch (error) {
        console.error('Error fetching product details:', error);
        res.status(500).json({ error: 'Failed to fetch product details' });
    }
});


// Get individual product by ID
router.get('/:id', async (req, res) => {
    try {
        const productId = parseInt(req.params.id);
        if (isNaN(productId)) return res.status(400).json({ error: 'Invalid product ID' });

        const query = `
            SELECT p.*, s.name as supplier_name,
                   CASE WHEN p.is_on_sale = true AND p.discount_price IS NOT NULL THEN p.discount_price ELSE p.price END as effective_selling_price
            FROM products p
            JOIN suppliers s ON p.supplier_id = s.id
            WHERE p.id = $1 AND s.is_active = true
        `;
        const result = await db.query(query, [productId]);

        if (result.rows.length === 0) return res.status(404).json({ error: 'Product not found' });
        
        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error fetching product:', error);
        res.status(500).json({ error: 'Failed to fetch product' });
    }
});

module.exports = router;