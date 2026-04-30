// routes/deals.js
const express = require('express');
const router = express.Router();
const { query, param, body } = require('express-validator');
const db = require('../config/db');
const authSupplier = require('../middleware/authSupplier');
const { invalidateCache } = require('../middleware/cache');
const { cacheResponse } = require('../middleware/cache');
const validateRequest = require('../middleware/validateRequest');
const { indexDealById } = require('../services/searchIndexer');
const { recordAuditEvent } = require('../services/auditService');
const logger = require('../services/logger');
const { parseBoolean } = require('../utils/parseBoolean');
const { buildDynamicUpdate } = require('../utils/dynamicUpdate');
const { hasAtLeastOneField, ensureProductBelongsToSupplier } = require('./deals.helpers');

const HTTP = Object.freeze({
    CREATED: Number.parseInt('201', 10),
    BAD_REQUEST: Number.parseInt('400', 10),
    FORBIDDEN: Number.parseInt('403', 10),
    NOT_FOUND: Number.parseInt('404', 10),
    INTERNAL_SERVER_ERROR: Number.parseInt('500', 10)
});

const VALIDATION_LIMITS = Object.freeze({
    MAX_ENTITY_ID: Number.parseInt('9999999', 10),
    MAX_TITLE_LENGTH: Number.parseInt('255', 10),
    MAX_DESCRIPTION_LENGTH: Number.parseInt('5000', 10),
    MAX_DISCOUNT_PERCENT: Number.parseInt('100', 10),
    MAX_URL_LENGTH: Number.parseInt('2048', 10)
});

const validateSupplierDealCreate = [
    body('title').trim().notEmpty().withMessage('Title is required').isLength({ max: VALIDATION_LIMITS.MAX_TITLE_LENGTH }).withMessage(`Title must be at most ${VALIDATION_LIMITS.MAX_TITLE_LENGTH} characters`),
    body('description').optional({ nullable: true }).isLength({ max: VALIDATION_LIMITS.MAX_DESCRIPTION_LENGTH }).withMessage(`Description must be at most ${VALIDATION_LIMITS.MAX_DESCRIPTION_LENGTH} characters`),
    body('discount_percentage').optional({ nullable: true }).isFloat({ min: 0, max: VALIDATION_LIMITS.MAX_DISCOUNT_PERCENT }).withMessage(`Discount percentage must be between 0 and ${VALIDATION_LIMITS.MAX_DISCOUNT_PERCENT}`),
    body('start_date').optional({ nullable: true }).isISO8601().withMessage('Start date must be a valid date'),
    body('end_date').optional({ nullable: true }).isISO8601().withMessage('End date must be a valid date'),
    body('product_id').optional({ nullable: true }).isInt({ min: 1, max: VALIDATION_LIMITS.MAX_ENTITY_ID }).withMessage('Product ID must be a positive integer'),
    body('image_url').optional({ nullable: true }).isLength({ max: VALIDATION_LIMITS.MAX_URL_LENGTH }).withMessage(`Image URL must be at most ${VALIDATION_LIMITS.MAX_URL_LENGTH} characters`),
    body('is_active').optional().isBoolean().withMessage('is_active must be a boolean'),
    body().custom((payload) => {
        if (payload?.start_date && payload?.end_date) {
            const start = new Date(payload.start_date);
            const end = new Date(payload.end_date);
            if (Number.isFinite(start.getTime()) && Number.isFinite(end.getTime()) && end < start) {
                throw new Error('end_date must be on or after start_date');
            }
        }
        return true;
    }),
    validateRequest
];

const validateSupplierDealUpdate = [
    param('id').isInt({ min: 1, max: VALIDATION_LIMITS.MAX_ENTITY_ID }).withMessage('Deal ID must be a positive integer'),
    body('title').optional().trim().notEmpty().withMessage('Title cannot be empty').isLength({ max: VALIDATION_LIMITS.MAX_TITLE_LENGTH }).withMessage(`Title must be at most ${VALIDATION_LIMITS.MAX_TITLE_LENGTH} characters`),
    body('description').optional({ nullable: true }).isLength({ max: VALIDATION_LIMITS.MAX_DESCRIPTION_LENGTH }).withMessage(`Description must be at most ${VALIDATION_LIMITS.MAX_DESCRIPTION_LENGTH} characters`),
    body('discount_percentage').optional({ nullable: true }).isFloat({ min: 0, max: VALIDATION_LIMITS.MAX_DISCOUNT_PERCENT }).withMessage(`Discount percentage must be between 0 and ${VALIDATION_LIMITS.MAX_DISCOUNT_PERCENT}`),
    body('start_date').optional({ nullable: true }).isISO8601().withMessage('Start date must be a valid date'),
    body('end_date').optional({ nullable: true }).isISO8601().withMessage('End date must be a valid date'),
    body('product_id').optional({ nullable: true }).isInt({ min: 1, max: VALIDATION_LIMITS.MAX_ENTITY_ID }).withMessage('Product ID must be a positive integer'),
    body('image_url').optional({ nullable: true }).isLength({ max: VALIDATION_LIMITS.MAX_URL_LENGTH }).withMessage(`Image URL must be at most ${VALIDATION_LIMITS.MAX_URL_LENGTH} characters`),
    body('is_active').optional().isBoolean().withMessage('is_active must be a boolean'),
    body().custom((payload) => {
        if (payload?.start_date && payload?.end_date) {
            const start = new Date(payload.start_date);
            const end = new Date(payload.end_date);
            if (Number.isFinite(start.getTime()) && Number.isFinite(end.getTime()) && end < start) {
                throw new Error('end_date must be on or after start_date');
            }
        }
        return true;
    }),
    validateRequest
];

const validateSupplierDealDelete = [
    param('id').isInt({ min: 1, max: VALIDATION_LIMITS.MAX_ENTITY_ID }).withMessage('Deal ID must be a positive integer'),
    validateRequest
];

// Get deals (with optional city filter)
router.get(
    '/',
    [
        query('cityId')
            .optional()
            .isInt({ min: 1, max: VALIDATION_LIMITS.MAX_ENTITY_ID })
            .withMessage('City ID must be a positive integer'),
        validateRequest,
        cacheResponse(60, 'deals:list')
    ],
    async (req, res) => {
    try {
        const cityId = req.query.cityId ? Number(req.query.cityId) : null;
        
        let query = `
            SELECT 
                d.*,
                s.name as supplier_name,
                p.name as product_name
            FROM deals d
            JOIN suppliers s ON d.supplier_id = s.id
            LEFT JOIN products p ON d.product_id = p.id
            WHERE d.is_active = true
            AND (d.start_date IS NULL OR d.start_date <= NOW())
            AND (d.end_date IS NULL OR d.end_date >= NOW())
        `;
        
        const queryParams = [];
        
        if (cityId) {
            query += `
                AND EXISTS (
                    SELECT 1
                    FROM supplier_cities sc
                    WHERE sc.supplier_id = s.id
                    AND sc.city_id = $1
                )
            `;
            queryParams.push(cityId);
        }
        
        query += ' ORDER BY d.created_at DESC';
        
        const result = await db.query(query, queryParams);
        res.json(result.rows);
    } catch (error) {
        logger.error('Error fetching deals', error);
        res.status(HTTP.INTERNAL_SERVER_ERROR).json({ error: 'Failed to fetch deals' });
    }
    }
);

// Get deal details
router.get(
    '/:id',
    [
        param('id').isInt({ min: 1, max: VALIDATION_LIMITS.MAX_ENTITY_ID }).withMessage('Deal ID must be a positive integer'),
        validateRequest,
        cacheResponse(60, 'deals:detail')
    ],
    async (req, res) => {
    try {
        const id = Number(req.params.id);
        
        const query = `
            SELECT 
                d.*,
                s.name as supplier_name,
                s.location as supplier_location,
                p.name as product_name,
                p.price as product_price,
                p.image_url as product_image_url
            FROM deals d
            JOIN suppliers s ON d.supplier_id = s.id
            LEFT JOIN products p ON d.product_id = p.id
            WHERE d.id = $1 AND d.is_active = true
        `;
        
        const result = await db.query(query, [id]);
        
        if (result.rows.length === 0) {
            return res.status(HTTP.NOT_FOUND).json({ error: 'Deal not found' });
        }
        
        res.json(result.rows[0]);
    } catch (error) {
        logger.error('Error fetching deal details', error);
        res.status(HTTP.INTERNAL_SERVER_ERROR).json({ error: 'Failed to fetch deal details' });
    }
    }
);

// Get supplier's own deals (authenticated)
router.get('/supplier/deals', authSupplier, async (req, res) => {
    try {
        const supplierId = req.supplier.supplierId;
        
        const query = `
            SELECT 
                d.*,
                p.name as product_name
            FROM deals d
            LEFT JOIN products p ON d.product_id = p.id
            WHERE d.supplier_id = $1
            ORDER BY d.created_at DESC
        `;
        
        const result = await db.query(query, [supplierId]);
        res.json(result.rows);
        
    } catch (error) {
        logger.error('Error fetching supplier deals', error);
        res.status(HTTP.INTERNAL_SERVER_ERROR).json({ error: 'Failed to fetch deals' });
    }
});

// Create new deal (authenticated supplier)
router.post('/supplier/deals', authSupplier, validateSupplierDealCreate, async (req, res) => {
    try {
        const supplierId = req.supplier.supplierId;
        const {
            title, description, discount_percentage, start_date, end_date,
            product_id, image_url, is_active = true
        } = req.body;

        const normalizedProductId = product_id ? parseInt(product_id, 10) : null;
        if (normalizedProductId && !(await ensureProductBelongsToSupplier(supplierId, normalizedProductId))) {
            return res.status(HTTP.FORBIDDEN).json({ error: 'Product not found or not owned by you' });
        }
        
        const insertQuery = `
            INSERT INTO deals (
                title, description, discount_percentage, start_date, end_date,
                product_id, image_url, is_active, supplier_id
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            RETURNING *
        `;
        
        const result = await db.query(insertQuery, [
            title, description, discount_percentage ? parseFloat(discount_percentage) : null,
            start_date || null, end_date || null, normalizedProductId,
            image_url, parseBoolean(is_active, true), supplierId
        ]);
        
        void invalidateCache(['deals:list', 'deals:detail', 'search', 'featured:items', 'featured:list']);
        void indexDealById(result.rows[0].id);
        void recordAuditEvent({
            req,
            action: 'deal_create',
            actorRole: 'supplier',
            actorId: supplierId,
            targetType: 'deal',
            targetId: result.rows[0].id,
            metadata: { title }
        });
        res.status(HTTP.CREATED).json(result.rows[0]);
        
    } catch (error) {
        logger.error('Error creating deal', error);
        res.status(HTTP.INTERNAL_SERVER_ERROR).json({ error: 'Failed to create deal' });
    }
});

// Update deal (authenticated supplier)
router.put('/supplier/deals/:id', authSupplier, validateSupplierDealUpdate, async (req, res) => {
    try {
        const id = parseInt(req.params.id, 10);
        const supplierId = req.supplier.supplierId;
        const {
            title, description, discount_percentage, start_date, end_date,
            product_id, image_url, is_active
        } = req.body;
        
        // Verify deal belongs to this supplier
        const verifyQuery = 'SELECT id FROM deals WHERE id = $1 AND supplier_id = $2';
        const verifyResult = await db.query(verifyQuery, [id, supplierId]);
        
        if (verifyResult.rows.length === 0) {
            return res.status(HTTP.NOT_FOUND).json({ error: 'Deal not found or not owned by you' });
        }

        const updatableFields = [
            'title',
            'description',
            'discount_percentage',
            'start_date',
            'end_date',
            'product_id',
            'image_url',
            'is_active'
        ];
        if (!hasAtLeastOneField(req.body, updatableFields)) {
            return res.status(HTTP.BAD_REQUEST).json({ error: 'No fields to update' });
        }

        if (product_id !== undefined && product_id !== null) {
            const normalizedProductId = parseInt(product_id, 10);
            if (!(await ensureProductBelongsToSupplier(supplierId, normalizedProductId))) {
                return res.status(HTTP.FORBIDDEN).json({ error: 'Product not found or not owned by you' });
            }
        }
        
        const { updateFields, updateValues, updatedFieldNames, nextParamIndex } = buildDynamicUpdate({
            payload: req.body,
            fieldMap: {
                title: {},
                description: {},
                discount_percentage: { transform: (value) => (value ? parseFloat(value) : null) },
                start_date: { transform: (value) => value || null },
                end_date: { transform: (value) => value || null },
                product_id: { transform: (value) => (value ? parseInt(value, 10) : null) },
                image_url: {},
                is_active: { transform: (value) => parseBoolean(value) },
            },
        });
        
        if (updateFields.length === 0) {
            return res.status(HTTP.BAD_REQUEST).json({ error: 'No fields to update' });
        }
        
        updateFields.push(`updated_at = NOW()`);
        updateValues.push(id);
        
        const updateQuery = `
            UPDATE deals 
            SET ${updateFields.join(', ')}
            WHERE id = $${nextParamIndex}
            RETURNING *
        `;
        
        const result = await db.query(updateQuery, updateValues);
        void invalidateCache(['deals:list', 'deals:detail', 'search', 'featured:items', 'featured:list']);
        void indexDealById(result.rows[0].id);
        void recordAuditEvent({
            req,
            action: 'deal_update',
            actorRole: 'supplier',
            actorId: supplierId,
            targetType: 'deal',
            targetId: result.rows[0].id,
            metadata: { updated_fields: updatedFieldNames }
        });
        res.json(result.rows[0]);
        
    } catch (error) {
        logger.error('Error updating deal', error);
        res.status(HTTP.INTERNAL_SERVER_ERROR).json({ error: 'Failed to update deal' });
    }
});

// Delete deal (authenticated supplier)
router.delete('/supplier/deals/:id', authSupplier, validateSupplierDealDelete, async (req, res) => {
    try {
        const id = parseInt(req.params.id, 10);
        const supplierId = req.supplier.supplierId;
        
        // Verify deal belongs to this supplier
        const verifyQuery = 'SELECT id FROM deals WHERE id = $1 AND supplier_id = $2';
        const verifyResult = await db.query(verifyQuery, [id, supplierId]);
        
        if (verifyResult.rows.length === 0) {
            return res.status(HTTP.NOT_FOUND).json({ error: 'Deal not found or not owned by you' });
        }
        
        const deleteQuery = 'DELETE FROM deals WHERE id = $1';
        await db.query(deleteQuery, [id]);
        
        void invalidateCache(['deals:list', 'deals:detail', 'search', 'featured:items', 'featured:list']);
        void indexDealById(id);
        void recordAuditEvent({
            req,
            action: 'deal_delete',
            actorRole: 'supplier',
            actorId: supplierId,
            targetType: 'deal',
            targetId: Number(id)
        });
        res.json({ message: 'Deal deleted successfully' });
        
    } catch (error) {
        logger.error('Error deleting deal', error);
        res.status(HTTP.INTERNAL_SERVER_ERROR).json({ error: 'Failed to delete deal' });
    }
});

module.exports = router;
