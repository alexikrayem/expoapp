// telegram-app-backend/services/pricingEngine.js
const cron = require('node-cron');
const db = require('../config/db'); // Adjust path to your db config
const logger = require('./logger');

const PRICING_ENGINE_LOCK_KEY = Number(process.env.PRICING_ENGINE_LOCK_KEY || 810321);

const calculateDemandAndAdjustPercentage = async () => {
    logger.info('Starting scheduled price adjustment percentage task', {
        timestamp: new Date().toISOString()
    });
    const client = await db.pool.connect();
    try {
        await client.query('BEGIN');

        const lockResult = await client.query(
            'SELECT pg_try_advisory_xact_lock($1) AS acquired',
            [PRICING_ENGINE_LOCK_KEY]
        );
        const acquired = lockResult.rows[0]?.acquired;
        if (acquired === false) {
            await client.query('ROLLBACK');
            logger.warn('Pricing adjustment skipped because another run is already in progress');
            return { skipped: true };
        }

        const SHORT_WINDOW_DAYS = Number(process.env.PRICING_WINDOW_SHORT_DAYS || 7);
        const LONG_WINDOW_DAYS = Number(process.env.PRICING_WINDOW_LONG_DAYS || 30);
        const MOMENTUM_STEP = Number(process.env.PRICING_MOMENTUM_STEP || 0.02);
        const MAX_STEP = Number(process.env.PRICING_MAX_STEP || 0.02);
        const MIN_ADJ = Number(process.env.PRICING_MIN_ADJ || -0.10);
        const MAX_ADJ = Number(process.env.PRICING_MAX_ADJ || 0.10);
        const COOLDOWN_HOURS = Number(process.env.PRICING_COOLDOWN_HOURS || 6);

        const adjustmentResult = await client.query(
            `
            WITH sales AS (
                SELECT
                    mp.id,
                    mp.current_price_adjustment_percentage AS current_adjustment,
                    mp.last_adjustment_update,
                    COALESCE(SUM(oi.quantity) FILTER (
                        WHERE o.order_date >= NOW() - ($1 * INTERVAL '1 day')
                    ), 0) AS sales_7d,
                    COALESCE(SUM(oi.quantity) FILTER (
                        WHERE o.order_date >= NOW() - ($2 * INTERVAL '1 day')
                    ), 0) AS sales_30d
                FROM master_products mp
                LEFT JOIN products p ON p.master_product_id = mp.id
                LEFT JOIN order_items oi ON oi.product_id = p.id
                LEFT JOIN orders o ON o.id = oi.order_id
                    AND o.status NOT IN ('cancelled', 'refunded', 'failed')
                    AND o.order_date >= NOW() - ($2 * INTERVAL '1 day')
                GROUP BY mp.id
            ),
            calc AS (
                SELECT
                    id,
                    current_adjustment,
                    last_adjustment_update,
                    sales_7d,
                    sales_30d,
                    sales_7d / NULLIF($1::numeric, 0) AS avg_7d,
                    sales_30d / NULLIF($2::numeric, 0) AS avg_30d
                FROM sales
            ),
            momentum AS (
                SELECT
                    id,
                    current_adjustment,
                    last_adjustment_update,
                    sales_7d,
                    sales_30d,
                    CASE
                        WHEN avg_30d IS NULL THEN 0
                        ELSE (avg_7d - avg_30d) / GREATEST(avg_30d, 1)
                    END AS momentum
                FROM calc
            ),
            adjusted AS (
                SELECT
                    id,
                    sales_7d,
                    current_adjustment,
                    last_adjustment_update,
                    LEAST(GREATEST(momentum * $3, -$4), $4) AS delta,
                    CASE
                        WHEN last_adjustment_update IS NOT NULL
                             AND last_adjustment_update > NOW() - ($7 * INTERVAL '1 hour')
                        THEN current_adjustment
                        ELSE LEAST(
                            GREATEST(current_adjustment + LEAST(GREATEST(momentum * $3, -$4), $4), $5),
                            $6
                        )
                    END AS new_adjustment
                FROM momentum
            )
            UPDATE master_products mp
            SET
                current_demand_score = adjusted.sales_7d,
                current_price_adjustment_percentage = adjusted.new_adjustment,
                last_adjustment_update = CASE
                    WHEN adjusted.new_adjustment <> mp.current_price_adjustment_percentage THEN NOW()
                    ELSE mp.last_adjustment_update
                END
            FROM adjusted
            WHERE mp.id = adjusted.id
            RETURNING mp.id, adjusted.sales_7d, adjusted.current_adjustment, mp.current_price_adjustment_percentage AS updated_adjustment
            `,
            [
                SHORT_WINDOW_DAYS,
                LONG_WINDOW_DAYS,
                MOMENTUM_STEP,
                MAX_STEP,
                MIN_ADJ,
                MAX_ADJ,
                COOLDOWN_HOURS
            ]
        );

        if (adjustmentResult.rows.length === 0) {
            logger.info('No master products found to process');
            await client.query('COMMIT'); // Important to commit even if no work
            return { updated: 0, changed: 0 };
        }

        const changed = adjustmentResult.rows.filter((row) => {
            const before = Number(row.current_adjustment);
            const after = Number(row.updated_adjustment);
            return Number.isFinite(before) && Number.isFinite(after) && before !== after;
        });

        logger.info('Pricing adjustment completed update pass', {
            processedCount: adjustmentResult.rows.length,
            changedCount: changed.length
        });
        await client.query('COMMIT');
        logger.info('Price adjustment percentage task completed successfully', {
            timestamp: new Date().toISOString()
        });
        return { updated: adjustmentResult.rows.length, changed: changed.length };
    } catch (error) {
        if (client) await client.query('ROLLBACK'); // Ensure rollback on error
        logger.error('Error during price adjustment task', error, {
            timestamp: new Date().toISOString()
        });
        throw error;
    } finally {
        if (client) client.release();
    }
};

module.exports = { calculateDemandAndAdjustPercentage };
