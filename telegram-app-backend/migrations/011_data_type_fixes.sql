-- Migration 011: Data Type Fixes, NOT NULL, and Missing Constraints
-- Per supabase-postgres-best-practices/references/schema-data-types.md:
-- "Always use TIMESTAMPTZ, not TIMESTAMP."
-- "Default to NOT NULL; make nullable only when genuinely optional."

BEGIN;

-- ============================================================
-- 1. Fix TIMESTAMP → TIMESTAMPTZ on 3 tables
--    featured_list_items.created_at, featured_lists.created_at/updated_at,
--    otp_verifications.expires_at/created_at
-- ============================================================

ALTER TABLE "featured_list_items"
    ALTER COLUMN "created_at" TYPE TIMESTAMPTZ(6) USING "created_at" AT TIME ZONE 'UTC';

ALTER TABLE "featured_lists"
    ALTER COLUMN "created_at" TYPE TIMESTAMPTZ(6) USING "created_at" AT TIME ZONE 'UTC',
    ALTER COLUMN "updated_at" TYPE TIMESTAMPTZ(6) USING "updated_at" AT TIME ZONE 'UTC';

ALTER TABLE "otp_verifications"
    ALTER COLUMN "expires_at" TYPE TIMESTAMPTZ(6) USING "expires_at" AT TIME ZONE 'UTC',
    ALTER COLUMN "created_at" TYPE TIMESTAMPTZ(6) USING "created_at" AT TIME ZONE 'UTC';

-- ============================================================
-- 2. Add NOT NULL to status columns that have defaults
--    These should never be NULL — their defaults guarantee a value on INSERT.
--    Using NOT VALID to avoid scanning existing data.
-- ============================================================

-- orders.status: default 'pending'
ALTER TABLE "orders"
    ALTER COLUMN "status" SET NOT NULL;

-- orders.delivery_status: default 'awaiting_fulfillment'
ALTER TABLE "orders"
    ALTER COLUMN "delivery_status" SET NOT NULL;

-- order_items.supplier_item_status: default 'pending'
ALTER TABLE "order_items"
    ALTER COLUMN "supplier_item_status" SET NOT NULL;

-- order_items.delivery_item_status: default 'pending_assignment'
ALTER TABLE "order_items"
    ALTER COLUMN "delivery_item_status" SET NOT NULL;

-- deals.is_active: default true
ALTER TABLE "deals"
    ALTER COLUMN "is_active" SET NOT NULL;

-- products.is_on_sale: default false
ALTER TABLE "products"
    ALTER COLUMN "is_on_sale" SET NOT NULL;

-- ============================================================
-- 3. Add missing supplier_item_status CHECK constraint
--    (004_status_constraints.sql constrained delivery_item_status and
--     orders.status but missed supplier_item_status)
-- ============================================================

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'order_items_supplier_status_valid'
        AND conrelid = 'order_items'::regclass
    ) THEN
        ALTER TABLE "order_items"
            ADD CONSTRAINT "order_items_supplier_status_valid"
            CHECK ("supplier_item_status" IN (
                'pending',
                'confirmed',
                'preparing',
                'ready',
                'shipped',
                'delivered',
                'cancelled',
                'failed'
            )) NOT VALID;
    END IF;
END $$;

-- ============================================================
-- 4. Add products linking_status CHECK constraint
-- ============================================================

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'products_linking_status_valid'
        AND conrelid = 'products'::regclass
    ) THEN
        ALTER TABLE "products"
            ADD CONSTRAINT "products_linking_status_valid"
            CHECK ("linking_status" IN (
                'pending',
                'linked',
                'rejected',
                'manual_review'
            )) NOT VALID;
    END IF;
END $$;

COMMIT;
