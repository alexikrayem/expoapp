-- Migration 013: Index Optimization
-- Drop redundant indexes and add performance partial indexes.
-- Per supabase-postgres-best-practices/references/query-partial-indexes.md:
-- "Partial indexes only include rows matching a WHERE condition, making them
--  smaller and faster when queries consistently filter on the same condition."

BEGIN;

-- ============================================================
-- 1. Drop redundant indexes on delivery_agents
--    UNIQUE indexes already serve as B-tree indexes for lookups.
--    Composite indexes already cover single-column leading prefix queries.
-- ============================================================

-- idx_delivery_agents_phone_number is redundant with UNIQUE delivery_agents_phone_number_key
DROP INDEX IF EXISTS "idx_delivery_agents_phone_number";

-- idx_delivery_agents_email is redundant with UNIQUE delivery_agents_email_key
DROP INDEX IF EXISTS "idx_delivery_agents_email";

-- idx_delivery_agents_telegram_user_id is redundant with UNIQUE delivery_agents_telegram_user_id_key
DROP INDEX IF EXISTS "idx_delivery_agents_telegram_user_id";

-- idx_delivery_agents_supplier_id is a prefix of composite idx_delivery_agents_supplier_active
DROP INDEX IF EXISTS "idx_delivery_agents_supplier_id";

-- ============================================================
-- 2. Drop redundant cart_items indexes
--    PK is (user_id, product_id), plus UNIQUE on (user_id, product_id) already exists.
-- ============================================================

-- idx_cart_items_user_id: user_id is the leading column of the PK
DROP INDEX IF EXISTS "idx_cart_items_user_id";

-- cart_items_user_id_product_id_key UNIQUE is redundant with the PK
DROP INDEX IF EXISTS "cart_items_user_id_product_id_key";

-- ============================================================
-- 3. Add partial indexes for hot-path queries
-- ============================================================

-- Active suppliers only (most supplier queries filter by is_active)
CREATE INDEX IF NOT EXISTS idx_suppliers_active_name
    ON "suppliers" ("name")
    WHERE is_active = true;

-- Pending orders (supplier dashboard hot-path)
CREATE INDEX IF NOT EXISTS idx_orders_pending
    ON "orders" ("order_date" DESC)
    WHERE status = 'pending';

-- Active, non-revoked refresh tokens
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_active
    ON "refresh_tokens" ("subject_id", "role")
    WHERE revoked_at IS NULL;

-- Pending notifications ready for processing
CREATE INDEX IF NOT EXISTS idx_pending_notifications_ready
    ON "pending_notifications" ("available_at")
    WHERE status = 'pending';

-- Active deals (most deal queries filter active)
CREATE INDEX IF NOT EXISTS idx_deals_active_dates
    ON "deals" ("start_date", "end_date")
    WHERE is_active = true;

-- Products with pending linking (product linking service hot-path)
CREATE INDEX IF NOT EXISTS idx_products_pending_linking
    ON "products" ("master_product_id")
    WHERE linking_status = 'pending';

COMMIT;
