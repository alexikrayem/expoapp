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
const { buildDynamicUpdate } = require('../../utils/dynamicUpdate');
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

// Get supplier's products with pagination
router.get('/products', authSupplier, validateSupplierProductsList, async (req, res) => {
    try {
        const supplierId = req.supplier.supplierId;
        const { page = 1, limit = 20 } = req.query;

        const offset = (parseInt(page) - 1) * parseInt(limit);

        const query = `
            SELECT 
                p.*,
                ${EFFECTIVE_PRICE_SQL} as effective_selling_price
            FROM products p
            LEFT JOIN master_products mp ON p.master_product_id = mp.id
            WHERE p.supplier_id = $1
            ORDER BY p.created_at DESC
            LIMIT $2 OFFSET $3
        `;

        const result = await db.query(query, [supplierId, parseInt(limit), offset]);
        res.json(result.rows);

    } catch (error) {
        logger.error('Error fetching supplier products', error);
        res.status(HTTP.INTERNAL_SERVER_ERROR).json({ error: 'Failed to fetch products' });
    }
});

// Create new product
router.post('/products', authSupplier, validateSupplierProductCreate, async (req, res) => {
    try {
        const supplierId = req.supplier.supplierId;
        const {
            name, standardized_name_input, description, price, discount_price,
            category, image_url, is_on_sale, stock_level
        } = req.body;

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
            category, image_url, parseBoolean(is_on_sale), parseInt(stock_level, 10) || 0,
            supplierId
        ]);
        const createdProduct = result.rows[0];

        void invalidateCache([
            'products:list',
            'products:categories',
            'products:detail',
            'products:batch',
            'products:favorite-details',
            'suppliers:list',
            'suppliers:detail',
            'search',
            'featured:items',
            'featured:list',
            'deals:list'
        ]);
        void indexProductById(result.rows[0].id);
        void recordAuditEvent({
            req,
            action: 'product_create',
            actorRole: 'supplier',
            actorId: supplierId,
            targetType: 'product',
            targetId: createdProduct.id,
            metadata: { name }
        });

        const linkingResult = await triggerProductLinking(createdProduct.id, { reason: 'product_create' });
        if (linkingResult?.status === 'failed') {
            await db.query('UPDATE products SET linking_status = $1 WHERE id = $2', ['failed', createdProduct.id]);
            return res.status(HTTP.CREATED).json({
                ...createdProduct,
                linking_status: 'failed',
                linking_warning: 'Product created, but auto-linking failed. It will be retried.'
            });
        }

        res.status(HTTP.CREATED).json(createdProduct);

    } catch (error) {
        logger.error('Error creating product', error);
        res.status(HTTP.INTERNAL_SERVER_ERROR).json({ error: 'Failed to create product' });
    }
});

// Update product
router.put('/products/:id', authSupplier, validateSupplierProductUpdate, async (req, res) => {
    try {
        const { id } = req.params;
        const supplierId = req.supplier.supplierId;
        const {
            name, standardized_name_input, description, price, discount_price,
            category, image_url, is_on_sale, stock_level
        } = req.body;

        const verifyQuery = `
            SELECT id, name, standardized_name_input, category, description, linking_status
            FROM products
            WHERE id = $1 AND supplier_id = $2
        `;
        const verifyResult = await db.query(verifyQuery, [id, supplierId]);

        if (verifyResult.rows.length === 0) {
            return res.status(HTTP.NOT_FOUND).json({ error: 'Product not found or not owned by you' });
        }

        const existingProduct = verifyResult.rows[0];

        const { updateFields, updateValues, updatedFieldNames, nextParamIndex } = buildDynamicUpdate({
            payload: req.body,
            fieldMap: {
                name: {},
                standardized_name_input: {},
                description: {},
                price: { transform: (value) => parseFloat(value) },
                discount_price: { transform: (value) => (value ? parseFloat(value) : null) },
                category: {},
                image_url: {},
                is_on_sale: { transform: (value) => parseBoolean(value) },
                stock_level: { transform: (value) => parseInt(value, 10) || 0 },
            },
        });

        if (updateFields.length === 0) {
            return res.status(HTTP.BAD_REQUEST).json({ error: 'No fields to update' });
        }

        updateFields.push(`updated_at = NOW()`);
        updateValues.push(id);

        const updateQuery = `
            UPDATE products 
            SET ${updateFields.join(', ')}
            WHERE id = $${nextParamIndex}
            RETURNING *
        `;

        const result = await db.query(updateQuery, updateValues);
        void invalidateCache([
            'products:list',
            'products:categories',
            'products:detail',
            'products:batch',
            'products:favorite-details',
            'suppliers:list',
            'suppliers:detail',
            'search',
            'featured:items',
            'featured:list',
            'deals:list'
        ]);
        void indexProductById(result.rows[0].id);
        void recordAuditEvent({
            req,
            action: 'product_update',
            actorRole: 'supplier',
            actorId: supplierId,
            targetType: 'product',
            targetId: result.rows[0].id,
            metadata: { updated_fields: updatedFieldNames }
        });

        const shouldRelink =
            (name !== undefined && name !== existingProduct.name) ||
            (standardized_name_input !== undefined && standardized_name_input !== existingProduct.standardized_name_input) ||
            (category !== undefined && category !== existingProduct.category) ||
            (description !== undefined && description !== existingProduct.description);

        if (shouldRelink || result.rows[0].linking_status === 'pending') {
            const linkingResult = await triggerProductLinking(result.rows[0].id, { reason: 'product_update', forceRelink: shouldRelink });
            if (linkingResult?.status === 'failed') {
                await db.query('UPDATE products SET linking_status = $1 WHERE id = $2', ['failed', result.rows[0].id]);
                return res.json({
                    ...result.rows[0],
                    linking_status: 'failed',
                    linking_warning: 'Product updated, but auto-linking failed. It will be retried.'
                });
            }
        }
        res.json(result.rows[0]);

    } catch (error) {
        logger.error('Error updating product', error);
        res.status(HTTP.INTERNAL_SERVER_ERROR).json({ error: 'Failed to update product' });
    }
});

// Delete product
router.delete('/products/:id', authSupplier, validateSupplierProductIdParam, async (req, res) => {
    try {
        const { id } = req.params;
        const supplierId = req.supplier.supplierId;

        const verifyQuery = 'SELECT id FROM products WHERE id = $1 AND supplier_id = $2';
        const verifyResult = await db.query(verifyQuery, [id, supplierId]);

        if (verifyResult.rows.length === 0) {
            return res.status(HTTP.NOT_FOUND).json({ error: 'Product not found or not owned by you' });
        }

        const orderCheckQuery = 'SELECT COUNT(*) as order_count FROM order_items WHERE product_id = $1';
        const orderCheckResult = await db.query(orderCheckQuery, [id]);

        if (parseInt(orderCheckResult.rows[0].order_count) > 0) {
            const deactivateQuery = 'UPDATE products SET is_active = false WHERE id = $1 RETURNING *';
            const result = await db.query(deactivateQuery, [id]);
            void indexProductById(id);
            void recordAuditEvent({
                req,
                action: 'product_deactivate',
                actorRole: 'supplier',
                actorId: supplierId,
                targetType: 'product',
                targetId: Number(id)
            });
            return res.json({ message: 'Product deactivated (has existing orders)', product: result.rows[0] });
        }

        const deleteQuery = 'DELETE FROM products WHERE id = $1';
        await db.query(deleteQuery, [id]);
        void invalidateCache([
            'products:list',
            'products:categories',
            'products:detail',
            'products:batch',
            'products:favorite-details',
            'suppliers:list',
            'suppliers:detail',
            'search',
            'featured:items',
            'featured:list',
            'deals:list'
        ]);
        void indexProductById(id);
        void recordAuditEvent({
            req,
            action: 'product_delete',
            actorRole: 'supplier',
            actorId: supplierId,
            targetType: 'product',
            targetId: Number(id)
        });
        res.json({ message: 'Product deleted successfully' });

    } catch (error) {
        logger.error('Error deleting product', error);
        res.status(HTTP.INTERNAL_SERVER_ERROR).json({ error: 'Failed to delete product' });
    }
});

// Bulk update product stock
router.put('/products/bulk-stock', authSupplier, validateSupplierBulkStockUpdate, async (req, res) => {
    try {
        const supplierId = req.supplier.supplierId;
        const { updates } = req.body;
        
        if (!Array.isArray(updates) || updates.length === 0) {
            return res.status(HTTP.BAD_REQUEST).json({ error: 'Updates array is required' });
        }
        
        const client = await db.pool.connect();
        
        try {
            await client.query('BEGIN');
            const updateMap = new Map();
            for (const update of updates) {
                const id = Number(update?.id);
                const stockLevel = Number(update?.stock_level);

                if (!Number.isInteger(id) || id <= 0) {
                    await client.query('ROLLBACK');
                    return res.status(HTTP.BAD_REQUEST).json({ error: 'Each update must include a valid product id' });
                }

                if (!Number.isFinite(stockLevel) || stockLevel < 0) {
                    await client.query('ROLLBACK');
                    return res.status(HTTP.BAD_REQUEST).json({ error: 'Each update must include a non-negative stock_level' });
                }

                updateMap.set(id, Math.trunc(stockLevel));
            }

            const productIds = Array.from(updateMap.keys());
            const stockLevels = Array.from(updateMap.values());

            if (productIds.length === 0) {
                await client.query('ROLLBACK');
                return res.status(HTTP.BAD_REQUEST).json({ error: 'Updates array is required' });
            }

            // Verify all products belong to this supplier
            const verifyQuery = 'SELECT id FROM products WHERE supplier_id = $1 AND id = ANY($2::int[])';
            const verifyResult = await client.query(verifyQuery, [supplierId, productIds]);

            if (verifyResult.rows.length !== productIds.length) {
                const foundIds = new Set(verifyResult.rows.map((row) => row.id));
                const missingIds = productIds.filter((id) => !foundIds.has(id));
                await client.query('ROLLBACK');
                return res.status(HTTP.NOT_FOUND).json({ error: `Product(s) not found or not owned by you: ${missingIds.join(', ')}` });
            }

            const updateQuery = `
                UPDATE products p
                SET stock_level = u.stock_level, updated_at = NOW()
                FROM (
                    SELECT unnest($1::int[]) AS id, unnest($2::int[]) AS stock_level
                ) AS u
                WHERE p.id = u.id AND p.supplier_id = $3
                RETURNING p.id
            `;
            const updateResult = await client.query(updateQuery, [productIds, stockLevels, supplierId]);
            const updatedProductIds = updateResult.rows.map((row) => row.id);
            
            await client.query('COMMIT');
            void invalidateCache([
                'products:list',
                'products:categories',
                'products:detail',
                'products:batch',
                'products:favorite-details',
                'suppliers:list',
                'suppliers:detail',
                'search',
                'featured:items',
                'featured:list',
                'deals:list'
            ]);
            updatedProductIds.forEach((productId) => {
                void indexProductById(productId);
            });
            res.json({ message: 'Stock levels updated successfully', updated_count: updatedProductIds.length });
            
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
        
    } catch (error) {
        logger.error('Error bulk updating stock', error);
        res.status(HTTP.INTERNAL_SERVER_ERROR).json({ error: 'Failed to update stock levels' });
    }
});


module.exports = router;
