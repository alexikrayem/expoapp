-- Migration 010: Missing Foreign Key Indexes
-- Per supabase-postgres-best-practices/references/schema-foreign-key-indexes.md:
-- "Postgres does not automatically index foreign key columns. Missing indexes
--  cause slow JOINs and CASCADE operations."

BEGIN;

-- deals.product_id — used in ON DELETE SET NULL cascade from products
CREATE INDEX IF NOT EXISTS idx_deals_product_id
    ON "deals" ("product_id");

-- featured_lists.created_by — FK to admins.id
CREATE INDEX IF NOT EXISTS idx_featured_lists_created_by
    ON "featured_lists" ("created_by");

-- order_items.assigned_delivery_agent_id — already has idx_order_items_assigned_agent ✅
-- pending_notifications.order_id — already has idx from 006 ✅
-- pending_notifications.supplier_id — already has idx from 006 ✅

COMMIT;
