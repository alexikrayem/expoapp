const { query, param, body } = require('express-validator');
const validateRequest = require('../../middleware/validateRequest');
const express = require('express');
const router = express.Router();
const db = require('../../config/db');
const logger = require('../../services/logger');
const authSupplier = require('../../middleware/authSupplier');
const bcrypt = require('bcrypt');
const { invalidateCache, cacheResponse } = require('../../middleware/cache');
const {
    indexProductById,
    indexSupplierById,
    reindexProductsBySupplierId,
    reindexDealsBySupplierId
} = require('../../services/searchIndexer');
const { validatePassword } = require('../../services/passwordPolicy');
const { recordAuditEvent } = require('../../services/auditService');
const { revokeAllForSubject } = require('../../services/tokenService');
const { EFFECTIVE_PRICE_SQL } = require('../../utils/pricing');
const { parseBoolean } = require('../../utils/parseBoolean');
const { triggerProductLinking } = require('../suppliers.helpers');
const {
    HTTP,
    VALIDATION_LIMITS,
    CACHE_TTL_SECONDS,
    validateSupplierCitiesUpdate,
    validateSupplierProductCreate,
    validateSupplierProductUpdate,
    validateSupplierProductIdParam,
    validateSupplierProductsList,
    validateSupplierBulkStockUpdate,
    validateDeliveryAgentCreate,
    validateDeliveryAgentUpdate,
    validateDeliveryAgentIdParam,
    validateSupplierOrdersList
} = require('./supplierUtils');

// ------------------------
// Public Supplier Routes
// ------------------------

// Get all suppliers (public)
router.get('/', [
    query('cityId').optional().isInt({ min: 1 }).withMessage('City ID must be a positive integer'),
    validateRequest,
    cacheResponse(60, 'suppliers:list')
], async (req, res) => {
    try {
        const { cityId } = req.query;

        let query = `
            SELECT 
                s.id,
                s.name,
                s.category,
                s.location,
                s.rating,
                s.image_url,
                s.description,
                s.created_at,
                s.updated_at,
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
        logger.error('Error fetching suppliers', error);
        res.status(HTTP.INTERNAL_SERVER_ERROR).json({ error: 'Failed to fetch suppliers' });
    }
});

// Get supplier details (public)
router.get('/:id', [
    param('id').isInt({ min: 1 }).withMessage('Supplier ID must be a positive integer'),
    validateRequest,
    cacheResponse(CACHE_TTL_SECONDS.SUPPLIER_DETAIL, 'suppliers:detail')
], async (req, res) => {
    try {
        const { id } = req.params;

        const supplierQuery = `
            SELECT 
                id,
                name,
                category,
                location,
                rating,
                image_url,
                description,
                created_at,
                updated_at
            FROM suppliers
            WHERE id = $1 AND is_active = true
        `;
        const supplierResult = await db.query(supplierQuery, [id]);

        if (supplierResult.rows.length === 0) {
            return res.status(HTTP.NOT_FOUND).json({ error: 'Supplier not found' });
        }

        const productsQuery = `
            SELECT 
                p.*,
                ${EFFECTIVE_PRICE_SQL} as effective_selling_price
            FROM products p
            LEFT JOIN master_products mp ON p.master_product_id = mp.id
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
        logger.error('Error fetching supplier details', error);
        res.status(HTTP.INTERNAL_SERVER_ERROR).json({ error: 'Failed to fetch supplier details' });
    }
});

module.exports = router;

module.exports = router;