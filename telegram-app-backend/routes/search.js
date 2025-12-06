// routes/search.js (UPGRADED SEARCH LOGIC WITH FUZZY MATCHING)
const express = require('express');
const router = express.Router();
const db = require('../config/db');

// Search across products, deals, and suppliers
router.get('/', async (req, res) => {
    try {
        const { searchTerm, cityId, limit = 20 } = req.query;

        if (!searchTerm || searchTerm.trim().length < 2) {
            return res.json({
                results: { products: { items: [], totalItems: 0 }, deals: [], suppliers: [] }
            });
        }

        const term = searchTerm.trim();
        const searchLimit = parseInt(limit);

        // --- Search Products ---
        // Uses pg_trgm for fuzzy matching (%) and similarity scoring
        let productsQuery = `
            SELECT p.*, s.name as supplier_name,
                   similarity(p.name, $1) as score,
                   CASE WHEN p.is_on_sale = true AND p.discount_price IS NOT NULL THEN p.discount_price ELSE p.price END as effective_selling_price
            FROM products p
            JOIN suppliers s ON p.supplier_id = s.id
            WHERE s.is_active = true
            AND (
                p.name % $1 OR 
                p.description % $1 OR 
                p.standardized_name_input % $1 OR 
                s.name % $1
            )
        `;
        const queryParams = [term];
        let paramIndex = 2;
        if (cityId) {
            productsQuery += ` AND s.id IN (SELECT supplier_id FROM supplier_cities WHERE city_id = $${paramIndex++})`;
            queryParams.push(cityId);
        }
        // Order by similarity score (highest first), then name
        productsQuery += ` ORDER BY score DESC, p.name ASC LIMIT $${paramIndex}`;
        queryParams.push(searchLimit);

        // --- Search Deals ---
        let dealsQuery = `
            SELECT d.*, s.name as supplier_name, p.name as product_name,
                   GREATEST(similarity(d.title, $1), similarity(d.description, $1)) as score
            FROM deals d
            JOIN suppliers s ON d.supplier_id = s.id
            LEFT JOIN products p ON d.product_id = p.id
            WHERE d.is_active = true AND s.is_active = true
            AND (d.title % $1 OR d.description % $1 OR s.name % $1)
            AND (d.start_date IS NULL OR d.start_date <= NOW())
            AND (d.end_date IS NULL OR d.end_date >= NOW())
        `;
        const dealsParams = [term];
        let dealsParamIndex = 2;
        if (cityId) {
            dealsQuery += ` AND s.id IN (SELECT supplier_id FROM supplier_cities WHERE city_id = $${dealsParamIndex++})`;
            dealsParams.push(cityId);
        }
        dealsQuery += ` ORDER BY score DESC, d.created_at DESC LIMIT $${dealsParamIndex}`;
        dealsParams.push(searchLimit);

        // --- Search Suppliers ---
        let suppliersQuery = `
            SELECT s.*, COUNT(p.id) as product_count,
                   similarity(s.name, $1) as score
            FROM suppliers s
            LEFT JOIN products p ON s.id = p.supplier_id
            WHERE s.is_active = true
            AND (s.name % $1 OR s.category % $1)
        `;
        const suppliersParams = [term];
        let suppliersParamIndex = 2;
        if (cityId) {
            suppliersQuery += ` AND s.id IN (SELECT supplier_id FROM supplier_cities WHERE city_id = $${suppliersParamIndex++})`;
            suppliersParams.push(cityId);
        }
        suppliersQuery += ` GROUP BY s.id ORDER BY score DESC, s.name ASC LIMIT $${suppliersParamIndex}`;
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
                    totalItems: productsResult.rows.length
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