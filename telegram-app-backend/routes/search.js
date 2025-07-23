// routes/search.js (CORRECTED)
const express = require('express');
const router = express.Router();
const db = require('../config/db');

// Search across products, deals, and suppliers
router.get('/', async (req, res) => {
    try {
        const { searchTerm, cityId, limit = 10 } = req.query;
        
        if (!searchTerm || searchTerm.trim().length < 2) { // Lowered to 2 chars for better UX
            return res.json({
                results: { products: { items: [], totalItems: 0 }, deals: [], suppliers: [] }
            });
        }
        
        const searchPattern = `%${searchTerm.trim()}%`;
        const searchLimit = parseInt(limit);
        
        // --- Search Products ---
        // FIX: Removed p.is_active, changed cityId filter to use supplier_cities
        let productsQuery = `
            SELECT p.*, s.name as supplier_name,
                   CASE WHEN p.is_on_sale = true AND p.discount_price IS NOT NULL THEN p.discount_price ELSE p.price END as effective_selling_price
            FROM products p
            JOIN suppliers s ON p.supplier_id = s.id
            WHERE s.is_active = true
            AND (p.name ILIKE $1 OR p.description ILIKE $1 OR p.standardized_name_input ILIKE $1)
        `;
        const queryParams = [searchPattern];
        let paramIndex = 2;
        if (cityId) {
            productsQuery += ` AND s.id IN (SELECT supplier_id FROM supplier_cities WHERE city_id = $${paramIndex++})`;
            queryParams.push(cityId);
        }
        productsQuery += ` ORDER BY p.name ASC LIMIT $${paramIndex}`;
        queryParams.push(searchLimit);
        
        // --- Search Deals ---
        // FIX: Changed cityId filter to use supplier_cities
        let dealsQuery = `
            SELECT d.*, s.name as supplier_name, p.name as product_name
            FROM deals d
            JOIN suppliers s ON d.supplier_id = s.id
            LEFT JOIN products p ON d.product_id = p.id
            WHERE d.is_active = true AND s.is_active = true
            AND (d.title ILIKE $1 OR d.description ILIKE $1)
            AND (d.start_date IS NULL OR d.start_date <= NOW())
            AND (d.end_date IS NULL OR d.end_date >= NOW())
        `;
        const dealsParams = [searchPattern];
        let dealsParamIndex = 2;
        if (cityId) {
            dealsQuery += ` AND s.id IN (SELECT supplier_id FROM supplier_cities WHERE city_id = $${dealsParamIndex++})`;
            dealsParams.push(cityId);
        }
        dealsQuery += ` ORDER BY d.created_at DESC LIMIT $${dealsParamIndex}`;
        dealsParams.push(searchLimit);
        
        // --- Search Suppliers ---
        // FIX: Removed p.is_active, changed cityId filter to use supplier_cities
        let suppliersQuery = `
            SELECT s.*, COUNT(p.id) as product_count
            FROM suppliers s
            LEFT JOIN products p ON s.id = p.supplier_id
            WHERE s.is_active = true
            AND (s.name ILIKE $1 OR s.category ILIKE $1 OR s.description ILIKE $1)
        `;
        const suppliersParams = [searchPattern];
        let suppliersParamIndex = 2;
        if (cityId) {
            suppliersQuery += ` AND s.id IN (SELECT supplier_id FROM supplier_cities WHERE city_id = $${suppliersParamIndex++})`;
            suppliersParams.push(cityId);
        }
        suppliersQuery += ` GROUP BY s.id ORDER BY s.name ASC LIMIT $${suppliersParamIndex}`;
        suppliersParams.push(searchLimit);
        
        // Execute all searches in parallel
        const [productsResult, dealsResult, suppliersResult] = await Promise.all([
            db.query(productsQuery, queryParams),
            db.query(dealsQuery, dealsParams),
            db.query(suppliersQuery, suppliersParams)
        ]);
        
        res.json({
            results: {
                products: {
                    items: productsResult.rows,
                    totalItems: productsResult.rows.length // Note: This is just the count of returned items, not total possible results. This is fine for search.
                },
                deals: dealsResult.rows,
                suppliers: suppliersResult.rows
            }
        });
        
    } catch (error) {
        console.error('Error performing search:', error);
        res.status(500).json({ error: 'Failed to perform search' });
    }
});

module.exports = router;