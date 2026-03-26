// telegram-app-backend/services/pricingEngine.js
const cron = require('node-cron');
const db = require('../config/db'); // Adjust path to your db config

const calculateDemandAndAdjustPercentage = async () => {
    console.log(`[ADJUSTMENT_ENGINE] ${new Date().toISOString()} Starting scheduled price adjustment percentage task...`);
    const client = await db.pool.connect();
    try {
        await client.query('BEGIN');

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
                        WHERE o.order_date >= NOW() - ($1::text || ' days')::interval
                    ), 0) AS sales_7d,
                    COALESCE(SUM(oi.quantity) FILTER (
                        WHERE o.order_date >= NOW() - ($2::text || ' days')::interval
                    ), 0) AS sales_30d
                FROM master_products mp
                LEFT JOIN products p ON p.master_product_id = mp.id
                LEFT JOIN order_items oi ON oi.product_id = p.id
                LEFT JOIN orders o ON o.id = oi.order_id
                    AND o.status NOT IN ('cancelled', 'refunded', 'failed')
                    AND o.order_date >= NOW() - ($2::text || ' days')::interval
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
                             AND last_adjustment_update > NOW() - ($7::text || ' hours')::interval
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
            console.log('[ADJUSTMENT_ENGINE] No master products found to process.');
            await client.query('COMMIT'); // Important to commit even if no work
            return;
        }

        const changed = adjustmentResult.rows.filter((row) => {
            const before = Number(row.current_adjustment);
            const after = Number(row.updated_adjustment);
            return Number.isFinite(before) && Number.isFinite(after) && before !== after;
        });

        console.log(`[ADJUSTMENT_ENGINE] Updated ${adjustmentResult.rows.length} master products. Adjustments changed for ${changed.length}.`);
        await client.query('COMMIT');
        console.log(`[ADJUSTMENT_ENGINE] ${new Date().toISOString()} Price adjustment percentage task completed successfully.`);
    } catch (error) {
        if (client) await client.query('ROLLBACK'); // Ensure rollback on error
        console.error(`[ADJUSTMENT_ENGINE] ${new Date().toISOString()} Error during price adjustment task:`, error);
    } finally {
        if (client) client.release();
    }
};

module.exports = { calculateDemandAndAdjustPercentage };
