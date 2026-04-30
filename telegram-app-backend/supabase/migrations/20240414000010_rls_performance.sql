-- Migration 009: RLS Performance Optimization
-- Per supabase-postgres-best-practices/references/security-rls-performance.md:
-- Wrapping function calls in (SELECT ...) ensures they are evaluated ONCE per query
-- instead of once PER ROW — yielding 100x+ speedup on large tables.
--
-- This migration drops and recreates all existing customer-facing RLS policies
-- from 005_auth_phone_rls_hardening.sql with the optimized pattern.

BEGIN;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated')
       OR NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
        RAISE NOTICE 'Skipping RLS performance optimization: roles not found.';
        RETURN;
    END IF;

    -- --------------------------------------------------------
    -- user_profiles: replace customer policies with optimized versions
    -- --------------------------------------------------------
    DROP POLICY IF EXISTS "user_profiles_customer_select_self" ON "user_profiles";
    CREATE POLICY "user_profiles_customer_select_self"
        ON "user_profiles" FOR SELECT TO authenticated
        USING (user_id = (SELECT app_private.request_user_id()));

    DROP POLICY IF EXISTS "user_profiles_customer_insert_self" ON "user_profiles";
    CREATE POLICY "user_profiles_customer_insert_self"
        ON "user_profiles" FOR INSERT TO authenticated
        WITH CHECK (
            user_id = (SELECT app_private.request_user_id())
            AND COALESCE((SELECT app_private.request_role()), '') = 'customer'
        );

    DROP POLICY IF EXISTS "user_profiles_customer_update_self" ON "user_profiles";
    CREATE POLICY "user_profiles_customer_update_self"
        ON "user_profiles" FOR UPDATE TO authenticated
        USING (user_id = (SELECT app_private.request_user_id()))
        WITH CHECK (user_id = (SELECT app_private.request_user_id()));

    -- --------------------------------------------------------
    -- cart_items: replace customer policy with optimized version
    -- --------------------------------------------------------
    DROP POLICY IF EXISTS "cart_items_customer_own_rows" ON "cart_items";
    CREATE POLICY "cart_items_customer_own_rows"
        ON "cart_items" FOR ALL TO authenticated
        USING (user_id = (SELECT app_private.request_user_id()))
        WITH CHECK (user_id = (SELECT app_private.request_user_id()));

    -- --------------------------------------------------------
    -- user_favorites: replace customer policy with optimized version
    -- --------------------------------------------------------
    DROP POLICY IF EXISTS "user_favorites_customer_own_rows" ON "user_favorites";
    CREATE POLICY "user_favorites_customer_own_rows"
        ON "user_favorites" FOR ALL TO authenticated
        USING (user_id = (SELECT app_private.request_user_id()))
        WITH CHECK (user_id = (SELECT app_private.request_user_id()));

    -- --------------------------------------------------------
    -- orders: replace customer policy with optimized version
    -- --------------------------------------------------------
    DROP POLICY IF EXISTS "orders_customer_own_rows" ON "orders";
    CREATE POLICY "orders_customer_own_rows"
        ON "orders" FOR ALL TO authenticated
        USING (user_id = (SELECT app_private.request_user_id()))
        WITH CHECK (user_id = (SELECT app_private.request_user_id()));

    -- --------------------------------------------------------
    -- order_items: replace customer read policy with optimized version
    -- --------------------------------------------------------
    DROP POLICY IF EXISTS "order_items_customer_read_own_order_rows" ON "order_items";
    CREATE POLICY "order_items_customer_read_own_order_rows"
        ON "order_items" FOR SELECT TO authenticated
        USING (
            EXISTS (
                SELECT 1
                FROM "orders" o
                WHERE o.id = order_items.order_id
                  AND o.user_id = (SELECT app_private.request_user_id())
            )
        );

END $$;

COMMIT;
