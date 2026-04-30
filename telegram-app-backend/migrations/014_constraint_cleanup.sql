-- Migration 014: Constraint Cleanup
-- Remove duplicate CHECK constraints that were defined both inline in
-- 001_initial_schema.sql and again via ALTER TABLE in 003_integrity_and_idempotency.sql.
--
-- We keep the named constraints from 003 (they have descriptive names and are
-- properly documented) and drop the unnamed inline ones from 001.

BEGIN;

-- ============================================================
-- 1. Drop unnamed inline constraints from 001 that conflict with 003's named versions
--    Postgres auto-names inline constraints, so we need to find them by table.
--    We use a DO block to safely drop them if they exist.
-- ============================================================

-- Products: drop inline duplicates, keep named ones from 003
DO $$
DECLARE
    r RECORD;
BEGIN
    -- Find unnamed CHECK constraints on products that duplicate 003's named constraints
    FOR r IN
        SELECT conname
        FROM pg_constraint
        WHERE conrelid = 'products'::regclass
          AND contype = 'c'
          AND conname NOT IN (
              'products_price_nonnegative',
              'products_discount_price_valid',
              'products_stock_nonnegative',
              'products_linking_status_valid'
          )
          -- Match constraints that check price, discount_price, or stock_level
          AND (
              pg_get_constraintdef(oid) LIKE '%price%'
              OR pg_get_constraintdef(oid) LIKE '%stock_level%'
              OR pg_get_constraintdef(oid) LIKE '%discount_price%'
          )
    LOOP
        EXECUTE format('ALTER TABLE products DROP CONSTRAINT IF EXISTS %I', r.conname);
        RAISE NOTICE 'Dropped duplicate constraint % on products', r.conname;
    END LOOP;
END $$;

-- Cart items: drop inline duplicate, keep named from 003
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN
        SELECT conname
        FROM pg_constraint
        WHERE conrelid = 'cart_items'::regclass
          AND contype = 'c'
          AND conname <> 'cart_items_quantity_positive'
          AND pg_get_constraintdef(oid) LIKE '%quantity%'
    LOOP
        EXECUTE format('ALTER TABLE cart_items DROP CONSTRAINT IF EXISTS %I', r.conname);
        RAISE NOTICE 'Dropped duplicate constraint % on cart_items', r.conname;
    END LOOP;
END $$;

-- Orders: drop inline duplicate for total_amount, keep named from 003
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN
        SELECT conname
        FROM pg_constraint
        WHERE conrelid = 'orders'::regclass
          AND contype = 'c'
          AND conname NOT IN (
              'orders_total_amount_nonnegative',
              'orders_status_valid',
              'orders_delivery_status_valid'
          )
          AND pg_get_constraintdef(oid) LIKE '%total_amount%'
    LOOP
        EXECUTE format('ALTER TABLE orders DROP CONSTRAINT IF EXISTS %I', r.conname);
        RAISE NOTICE 'Dropped duplicate constraint % on orders', r.conname;
    END LOOP;
END $$;

-- Order items: drop inline duplicates for quantity and price
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN
        SELECT conname
        FROM pg_constraint
        WHERE conrelid = 'order_items'::regclass
          AND contype = 'c'
          AND conname NOT IN (
              'order_items_quantity_positive',
              'order_items_price_nonnegative',
              'order_items_delivery_status_valid',
              'order_items_supplier_status_valid'
          )
          AND (
              pg_get_constraintdef(oid) LIKE '%quantity%'
              OR pg_get_constraintdef(oid) LIKE '%price_at_time_of_order%'
          )
    LOOP
        EXECUTE format('ALTER TABLE order_items DROP CONSTRAINT IF EXISTS %I', r.conname);
        RAISE NOTICE 'Dropped duplicate constraint % on order_items', r.conname;
    END LOOP;
END $$;

-- Deals: drop inline duplicate for discount_percentage
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN
        SELECT conname
        FROM pg_constraint
        WHERE conrelid = 'deals'::regclass
          AND contype = 'c'
          AND conname NOT IN (
              'deals_discount_percentage_valid',
              'deals_date_range_valid'
          )
          AND pg_get_constraintdef(oid) LIKE '%discount_percentage%'
    LOOP
        EXECUTE format('ALTER TABLE deals DROP CONSTRAINT IF EXISTS %I', r.conname);
        RAISE NOTICE 'Dropped duplicate constraint % on deals', r.conname;
    END LOOP;
END $$;

COMMIT;
