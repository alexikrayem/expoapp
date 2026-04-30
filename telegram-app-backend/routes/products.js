// routes/products.js (UPGRADED WITH SMARTER ALTERNATIVES)
const express = require('express');
const { query, param, body } = require('express-validator');
const router = express.Router();
const db = require('../config/db');
const logger = require('../services/logger');
const validateRequest = require('../middleware/validateRequest');
const { cacheResponse } = require('../middleware/cache');
const { getRelatedProducts } = require('../services/relatedProductsService');
const { EFFECTIVE_PRICE_SQL } = require('../utils/pricing');

const HTTP = Object.freeze({
    BAD_REQUEST: Number.parseInt('400', 10),
    NOT_FOUND: Number.parseInt('404', 10),
    INTERNAL_SERVER_ERROR: Number.parseInt('500', 10)
});

const VALIDATION_LIMITS = Object.freeze({
    MAX_PAGE: Number.parseInt('1000', 10),
    MAX_LIMIT: Number.parseInt('100', 10),
    MAX_SEARCH_TERM_LENGTH: Number.parseInt('100', 10)
});

const CACHE_TTL_SECONDS = Object.freeze({
    PRODUCTS_LIST: Number.parseInt('60', 10),
    PRODUCTS_CATEGORIES: Number.parseInt('300', 10),
    PRODUCTS_BATCH: Number.parseInt('60', 10),
    FAVORITE_DETAILS: Number.parseInt('60', 10),
    PRODUCT_DETAIL: Number.parseInt('60', 10)
});

// Get all products with filtering, search, and pagination
router.get('/', [
    query('page')
        .optional()
        .isInt({ min: 1, max: VALIDATION_LIMITS.MAX_PAGE })
        .withMessage(`Page must be an integer between 1 and ${VALIDATION_LIMITS.MAX_PAGE}`),
    query('limit')
        .optional()
        .isInt({ min: 1, max: VALIDATION_LIMITS.MAX_LIMIT })
        .withMessage(`Limit must be an integer between 1 and ${VALIDATION_LIMITS.MAX_LIMIT}`),
    query('cityId').optional().isInt({ min: 1 }).withMessage('City ID must be a positive integer'),
    query('category').optional().trim().isLength({ max: 50 }).withMessage('Category must be at most 50 characters'),
    query('searchTerm')
        .optional()
        .trim()
        .isLength({ max: VALIDATION_LIMITS.MAX_SEARCH_TERM_LENGTH })
        .withMessage(`Search term must be at most ${VALIDATION_LIMITS.MAX_SEARCH_TERM_LENGTH} characters`),
    query('minPrice').optional().isFloat({ min: 0 }).withMessage('Min price must be a positive number'),
    query('maxPrice').optional().isFloat({ min: 0 }).withMessage('Max price must be a positive number'),
    query('onSale').optional().isIn(['true', 'false']).withMessage('onSale must be true or false'),
    validateRequest,
    cacheResponse(CACHE_TTL_SECONDS.PRODUCTS_LIST, 'products:list')
], async (req, res) => {
    try {
        // Validation handled by middleware

        const { page = 1, limit = 12, cityId, category, searchTerm, minPrice, maxPrice, onSale } = req.query;
        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);
        const offset = (pageNum - 1) * limitNum;

        let whereConditions = ['s.is_active = true'];
        let queryParams = [];
        let paramIndex = 1;

        if (cityId) {
            whereConditions.push(`s.id IN (SELECT supplier_id FROM supplier_cities WHERE city_id = $${paramIndex++})`);
            queryParams.push(parseInt(cityId));
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
        if (minPrice) {
            whereConditions.push(`p.price >= $${paramIndex++}`);
            queryParams.push(parseFloat(minPrice));
        }
        if (maxPrice) {
            whereConditions.push(`p.price <= $${paramIndex++}`);
            queryParams.push(parseFloat(maxPrice));
        }
        if (onSale === 'true') {
            whereConditions.push('p.is_on_sale = true');
        }

        const whereClause = `WHERE ${whereConditions.join(' AND ')}`;

        const productsQuery = `
            SELECT p.*, s.name as supplier_name,
                   ${EFFECTIVE_PRICE_SQL} as effective_selling_price,
                   COUNT(*) OVER() as total_count
            FROM products p
            JOIN suppliers s ON p.supplier_id = s.id
            LEFT JOIN master_products mp ON p.master_product_id = mp.id
            ${whereClause}
            ORDER BY p.created_at DESC
            LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;

        const productsResult = await db.query(productsQuery, [...queryParams, limitNum, offset]);
        const totalCount = productsResult.rows.length > 0 ? parseInt(productsResult.rows[0].total_count) : 0;

        res.json({
            items: productsResult.rows,
            currentPage: pageNum,
            totalPages: totalCount === 0 ? 0 : Math.ceil(totalCount / limitNum),
        });
    } catch (error) {
        logger.error('Error fetching products', error);
        res.status(HTTP.INTERNAL_SERVER_ERROR).json({ error: 'Failed to fetch products' });
    }
});

// Get product categories for filter options
router.get('/categories', [
    query('cityId').optional().isInt({ min: 1 }).withMessage('City ID must be a positive integer'),
    validateRequest,
    cacheResponse(CACHE_TTL_SECONDS.PRODUCTS_CATEGORIES, 'products:categories')
], async (req, res) => {
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
            queryParams.push(parseInt(cityId));
        }
        query += `
            GROUP BY p.category
            HAVING COUNT(*) > 0
            ORDER BY product_count DESC, p.category ASC
        `;
        const result = await db.query(query, queryParams);
        res.json({ categories: result.rows });
    } catch (error) {
        logger.error('Error fetching categories', error);
        res.status(HTTP.INTERNAL_SERVER_ERROR).json({ error: 'Failed to fetch categories' });
    }
});

// Get products by batch of IDs (for favorites tab)
router.get('/batch', [
    query('ids').optional().trim().matches(/^[\d,]+$/).withMessage('IDs must be comma-separated integers'),
    validateRequest
], cacheResponse(CACHE_TTL_SECONDS.PRODUCTS_BATCH, 'products:batch'), async (req, res) => {
    try {
        const { ids } = req.query;
        if (!ids) return res.json([]);

        const productIds = ids.split(',')
            .map(id => parseInt(id))
            .filter(id => !isNaN(id) && id > 0);

        if (productIds.length === 0 || productIds.length > 50) {
            return res.status(HTTP.BAD_REQUEST).json({ error: 'Invalid product IDs provided' });
        }

        const placeholders = productIds.map((_, index) => `$${index + 1}`).join(',');
        const query = `
            SELECT p.*, s.name as supplier_name,
                   ${EFFECTIVE_PRICE_SQL} as effective_selling_price
            FROM products p
            JOIN suppliers s ON p.supplier_id = s.id
            LEFT JOIN master_products mp ON p.master_product_id = mp.id
            WHERE p.id IN (${placeholders}) AND s.is_active = true
        `;
        const result = await db.query(query, productIds);
        res.json(result.rows);
    } catch (error) {
        logger.error('Error fetching products batch', error);
        res.status(HTTP.INTERNAL_SERVER_ERROR).json({ error: 'Failed to fetch products' });
    }
});


// Get favorite product details with alternatives (used in ProductDetailModal)
router.get('/favorite-details/:productId', [
    param('productId').isInt({ min: 1 }).withMessage('Product ID must be a positive integer'),
    validateRequest
], cacheResponse(CACHE_TTL_SECONDS.FAVORITE_DETAILS, 'products:favorite-details'), async (req, res) => {
    try {
        const { productId } = req.params;

        // Step 1: Fetch the main product and its supplier in a single, efficient query.
        const productQuery = `
            SELECT p.*, s.name as supplier_name, s.is_active as supplier_is_active,
                   ${EFFECTIVE_PRICE_SQL} as effective_selling_price
            FROM products p
            LEFT JOIN suppliers s ON p.supplier_id = s.id
            LEFT JOIN master_products mp ON p.master_product_id = mp.id
            WHERE p.id = $1
        `;
        const productPromise = db.query(productQuery, [parseInt(productId)]);

        // We will run the product fetch and potentially the alternatives fetch in parallel.
        const [productResult] = await Promise.all([productPromise]);

        if (productResult.rows.length === 0) {
            return res.status(HTTP.NOT_FOUND).json({ error: 'Product not found' });
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
                           ${EFFECTIVE_PRICE_SQL} as effective_selling_price
                    FROM products p
                    JOIN suppliers s ON p.supplier_id = s.id
                    LEFT JOIN master_products mp ON p.master_product_id = mp.id
                    WHERE p.master_product_id = $1 AND p.id != $2 AND s.is_active = true AND p.stock_level > 0
                    ORDER BY p.price ASC LIMIT 5`;
                alternativesParams = [product.master_product_id, parseInt(productId)];
            } else if (product.standardized_name_input) {
                alternativesQuery = `
                    SELECT p.*, s.name as supplier_name,
                           ${EFFECTIVE_PRICE_SQL} as effective_selling_price
                    FROM products p
                    JOIN suppliers s ON p.supplier_id = s.id
                    LEFT JOIN master_products mp ON p.master_product_id = mp.id
                    WHERE p.standardized_name_input ILIKE $1 AND p.id != $2 AND s.is_active = true AND p.stock_level > 0
                    ORDER BY p.price ASC LIMIT 3`;
                alternativesParams = [`%${product.standardized_name_input}%`, parseInt(productId)];
            }

            if (alternativesQuery) {
                const alternativesResult = await db.query(alternativesQuery, alternativesParams);
                alternatives = alternativesResult.rows;
            }
        }

        const responseData = {
            originalProduct: {
                ...product,
                effective_selling_price: product.effective_selling_price
            },
            isAvailable,
            alternatives
        };

        res.json(responseData);

    } catch (error) {
        logger.error('Error fetching product details', error);
        res.status(HTTP.INTERNAL_SERVER_ERROR).json({ error: 'Failed to fetch product details' });
    }
});


// Get individual product by ID
router.get('/:id/related', [
    param('id').isInt({ min: 1 }).withMessage('Product ID must be a positive integer'),
    query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('Limit must be between 1 and 50'),
    validateRequest
], async (req, res) => {
    try {
        const productId = parseInt(req.params.id);
        const { limit } = req.query;
        const related = await getRelatedProducts(productId, limit);
        res.json(related);
    } catch (error) {
        logger.error('Error fetching related products', error);
        res.status(HTTP.INTERNAL_SERVER_ERROR).json({ error: 'Failed to fetch related products' });
    }
});

// Get individual product by ID
router.get('/:id', [
    param('id').isInt({ min: 1 }).withMessage('Product ID must be a positive integer'),
    query('includeRelated').optional().isIn(['true', 'false']).withMessage('includeRelated must be true or false'),
    validateRequest
], cacheResponse(60, 'products:detail'), async (req, res) => {
    try {
        const productId = parseInt(req.params.id);

        const query = `
            SELECT p.*, s.name as supplier_name,
                   ${EFFECTIVE_PRICE_SQL} as effective_selling_price
            FROM products p
            JOIN suppliers s ON p.supplier_id = s.id
            LEFT JOIN master_products mp ON p.master_product_id = mp.id
            WHERE p.id = $1 AND s.is_active = true
        `;
        const result = await db.query(query, [productId]);

        if (result.rows.length === 0) return res.status(HTTP.NOT_FOUND).json({ error: 'Product not found' });

        const product = result.rows[0];
        if (req.query.includeRelated === 'true') {
            const related = await getRelatedProducts(productId);
            return res.json({ ...product, related });
        }

        res.json(product);
    } catch (error) {
        logger.error('Error fetching product', error);
        res.status(HTTP.INTERNAL_SERVER_ERROR).json({ error: 'Failed to fetch product' });
    }
});

module.exports = router;
