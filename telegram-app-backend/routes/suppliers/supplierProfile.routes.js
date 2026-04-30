const { query, param, body } = require('express-validator');
const validateRequest = require('../../middleware/validateRequest');
const express = require('express');
const router = express.Router();
const db = require('../../config/db');
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
const logger = require('../../services/logger');
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

router.get('/profile', authSupplier, async (req, res) => {
    try {
        const supplierId = req.supplier.supplierId;

        const query = `
            SELECT 
                   s.id,
                   s.name,
                   s.category,
                   s.location,
                   s.rating,
                   s.image_url,
                   s.description,
                   s.email,
                   s.is_active,
                   s.created_at,
                   s.updated_at,
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
            return res.status(HTTP.NOT_FOUND).json({ error: 'Supplier not found' });
        }

        res.json(result.rows[0]);

    } catch (error) {
        logger.error('Error fetching supplier profile', error);
        res.status(HTTP.INTERNAL_SERVER_ERROR).json({ error: 'Failed to fetch profile' });
    }
});

// Get supplier's cities
router.get('/cities', authSupplier, async (req, res) => {
    try {
        const supplierId = req.supplier.supplierId;

        const query = `
            SELECT sc.id, sc.supplier_id, sc.city_id, c.name as city_name
            FROM supplier_cities sc
            JOIN cities c ON sc.city_id = c.id
            WHERE sc.supplier_id = $1
            ORDER BY c.name ASC
        `;

        const result = await db.query(query, [supplierId]);
        res.json(result.rows);

    } catch (error) {
        logger.error('Error fetching supplier cities', error);
        res.status(HTTP.INTERNAL_SERVER_ERROR).json({ error: 'Failed to fetch cities' });
    }
});

// Update supplier's cities
router.put('/cities', authSupplier, validateSupplierCitiesUpdate, async (req, res) => {
    try {
        const supplierId = req.supplier.supplierId;
        const { city_ids } = req.body;

        if (!Array.isArray(city_ids)) {
            return res.status(HTTP.BAD_REQUEST).json({ error: 'city_ids must be an array' });
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
            void invalidateCache([
                'products:list',
                'products:categories',
                'products:detail',
                'products:batch',
                'products:favorite-details',
                'suppliers:list',
                'suppliers:detail',
                'deals:list',
                'search'
            ]);
            void indexSupplierById(supplierId);
            void reindexProductsBySupplierId(supplierId);
            void reindexDealsBySupplierId(supplierId);
            void recordAuditEvent({
                req,
                action: 'supplier_cities_update',
                actorRole: 'supplier',
                actorId: supplierId,
                targetType: 'supplier',
                targetId: supplierId,
                metadata: { city_count: city_ids.length }
            });
            res.json({ message: 'Cities updated successfully' });

        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }

    } catch (error) {
        logger.error('Error updating supplier cities', error);
        res.status(HTTP.INTERNAL_SERVER_ERROR).json({ error: 'Failed to update cities' });
    }
});


module.exports = router;
