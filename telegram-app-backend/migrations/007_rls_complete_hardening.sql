-- Migration 007: Complete RLS Hardening
-- Enable RLS on all 12 unprotected public tables with appropriate policies.
-- Per Supabase best practices: every table in an exposed schema MUST have RLS enabled.
-- Ref: supabase-postgres-best-practices/references/security-rls-basics.md

BEGIN;

-- ============================================================
-- 1. Enable RLS on all unprotected tables
-- ============================================================

ALTER TABLE "products"            ENABLE ROW LEVEL SECURITY;
ALTER TABLE "suppliers"           ENABLE ROW LEVEL SECURITY;
ALTER TABLE "admins"              ENABLE ROW LEVEL SECURITY;
ALTER TABLE "delivery_agents"     ENABLE ROW LEVEL SECURITY;
ALTER TABLE "deals"               ENABLE ROW LEVEL SECURITY;
ALTER TABLE "cities"              ENABLE ROW LEVEL SECURITY;
ALTER TABLE "supplier_cities"     ENABLE ROW LEVEL SECURITY;
ALTER TABLE "featured_items"      ENABLE ROW LEVEL SECURITY;
ALTER TABLE "featured_lists"      ENABLE ROW LEVEL SECURITY;
ALTER TABLE "featured_list_items" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "master_products"     ENABLE ROW LEVEL SECURITY;
ALTER TABLE "otp_verifications"   ENABLE ROW LEVEL SECURITY;
ALTER TABLE "refresh_tokens"      ENABLE ROW LEVEL SECURITY;
ALTER TABLE "audit_events"        ENABLE ROW LEVEL SECURITY;
ALTER TABLE "idempotency_keys"    ENABLE ROW LEVEL SECURITY;
ALTER TABLE "pending_notifications" ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 2. FORCE RLS on ALL tables (including previously-enabled ones)
--    This ensures the table owner (postgres) cannot bypass policies.
-- ============================================================

ALTER TABLE "user_profiles"       FORCE ROW LEVEL SECURITY;
ALTER TABLE "cart_items"           FORCE ROW LEVEL SECURITY;
ALTER TABLE "user_favorites"      FORCE ROW LEVEL SECURITY;
ALTER TABLE "orders"              FORCE ROW LEVEL SECURITY;
ALTER TABLE "order_items"         FORCE ROW LEVEL SECURITY;
ALTER TABLE "products"            FORCE ROW LEVEL SECURITY;
ALTER TABLE "suppliers"           FORCE ROW LEVEL SECURITY;
ALTER TABLE "admins"              FORCE ROW LEVEL SECURITY;
ALTER TABLE "delivery_agents"     FORCE ROW LEVEL SECURITY;
ALTER TABLE "deals"               FORCE ROW LEVEL SECURITY;
ALTER TABLE "cities"              FORCE ROW LEVEL SECURITY;
ALTER TABLE "supplier_cities"     FORCE ROW LEVEL SECURITY;
ALTER TABLE "featured_items"      FORCE ROW LEVEL SECURITY;
ALTER TABLE "featured_lists"      FORCE ROW LEVEL SECURITY;
ALTER TABLE "featured_list_items" FORCE ROW LEVEL SECURITY;
ALTER TABLE "master_products"     FORCE ROW LEVEL SECURITY;
ALTER TABLE "otp_verifications"   FORCE ROW LEVEL SECURITY;
ALTER TABLE "refresh_tokens"      FORCE ROW LEVEL SECURITY;
ALTER TABLE "audit_events"        FORCE ROW LEVEL SECURITY;
ALTER TABLE "idempotency_keys"    FORCE ROW LEVEL SECURITY;
ALTER TABLE "pending_notifications" FORCE ROW LEVEL SECURITY;

-- ============================================================
-- 3. Policies — guarded by role existence check
-- ============================================================

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated')
       OR NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
        RAISE NOTICE 'Skipping RLS policies: roles authenticated/service_role not found.';
        RETURN;
    END IF;

    -- --------------------------------------------------------
    -- 3a. CREDENTIAL TABLES — service_role only, zero public access
    --     admins, suppliers, delivery_agents, otp_verifications,
    --     refresh_tokens, audit_events, idempotency_keys
    -- --------------------------------------------------------

    -- admins: only service_role
    DROP POLICY IF EXISTS "admins_service_role" ON "admins";
    CREATE POLICY "admins_service_role"
        ON "admins" FOR ALL TO service_role
        USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "admins_deny_all" ON "admins";
    CREATE POLICY "admins_deny_all"
        ON "admins" FOR ALL TO authenticated
        USING (false) WITH CHECK (false);

    -- suppliers: service_role full, authenticated read active only (no password_hash via Data API columns)
    DROP POLICY IF EXISTS "suppliers_service_role" ON "suppliers";
    CREATE POLICY "suppliers_service_role"
        ON "suppliers" FOR ALL TO service_role
        USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "suppliers_public_read_active" ON "suppliers";
    CREATE POLICY "suppliers_public_read_active"
        ON "suppliers" FOR SELECT TO authenticated
        USING (is_active = true);

    -- delivery_agents: service_role only
    DROP POLICY IF EXISTS "delivery_agents_service_role" ON "delivery_agents";
    CREATE POLICY "delivery_agents_service_role"
        ON "delivery_agents" FOR ALL TO service_role
        USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "delivery_agents_deny_all" ON "delivery_agents";
    CREATE POLICY "delivery_agents_deny_all"
        ON "delivery_agents" FOR ALL TO authenticated
        USING (false) WITH CHECK (false);

    -- otp_verifications: service_role only
    DROP POLICY IF EXISTS "otp_verifications_service_role" ON "otp_verifications";
    CREATE POLICY "otp_verifications_service_role"
        ON "otp_verifications" FOR ALL TO service_role
        USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "otp_verifications_deny_all" ON "otp_verifications";
    CREATE POLICY "otp_verifications_deny_all"
        ON "otp_verifications" FOR ALL TO authenticated
        USING (false) WITH CHECK (false);

    -- refresh_tokens: service_role only
    DROP POLICY IF EXISTS "refresh_tokens_service_role" ON "refresh_tokens";
    CREATE POLICY "refresh_tokens_service_role"
        ON "refresh_tokens" FOR ALL TO service_role
        USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "refresh_tokens_deny_all" ON "refresh_tokens";
    CREATE POLICY "refresh_tokens_deny_all"
        ON "refresh_tokens" FOR ALL TO authenticated
        USING (false) WITH CHECK (false);

    -- audit_events: service_role only
    DROP POLICY IF EXISTS "audit_events_service_role" ON "audit_events";
    CREATE POLICY "audit_events_service_role"
        ON "audit_events" FOR ALL TO service_role
        USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "audit_events_deny_all" ON "audit_events";
    CREATE POLICY "audit_events_deny_all"
        ON "audit_events" FOR ALL TO authenticated
        USING (false) WITH CHECK (false);

    -- idempotency_keys: service_role only
    DROP POLICY IF EXISTS "idempotency_keys_service_role" ON "idempotency_keys";
    CREATE POLICY "idempotency_keys_service_role"
        ON "idempotency_keys" FOR ALL TO service_role
        USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "idempotency_keys_deny_all" ON "idempotency_keys";
    CREATE POLICY "idempotency_keys_deny_all"
        ON "idempotency_keys" FOR ALL TO authenticated
        USING (false) WITH CHECK (false);

    -- pending_notifications: service_role only
    DROP POLICY IF EXISTS "pending_notifications_service_role" ON "pending_notifications";
    CREATE POLICY "pending_notifications_service_role"
        ON "pending_notifications" FOR ALL TO service_role
        USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "pending_notifications_deny_all" ON "pending_notifications";
    CREATE POLICY "pending_notifications_deny_all"
        ON "pending_notifications" FOR ALL TO authenticated
        USING (false) WITH CHECK (false);

    -- --------------------------------------------------------
    -- 3b. PUBLIC-READABLE TABLES — service_role full, authenticated read
    --     products, deals, cities, featured_items, featured_lists,
    --     featured_list_items, master_products, supplier_cities
    -- --------------------------------------------------------

    -- products: read for authenticated, full for service_role
    DROP POLICY IF EXISTS "products_service_role" ON "products";
    CREATE POLICY "products_service_role"
        ON "products" FOR ALL TO service_role
        USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "products_public_read" ON "products";
    CREATE POLICY "products_public_read"
        ON "products" FOR SELECT TO authenticated
        USING (true);

    -- deals: read active for authenticated, full for service_role
    DROP POLICY IF EXISTS "deals_service_role" ON "deals";
    CREATE POLICY "deals_service_role"
        ON "deals" FOR ALL TO service_role
        USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "deals_public_read_active" ON "deals";
    CREATE POLICY "deals_public_read_active"
        ON "deals" FOR SELECT TO authenticated
        USING (is_active = true);

    -- cities: read for authenticated, full for service_role
    DROP POLICY IF EXISTS "cities_service_role" ON "cities";
    CREATE POLICY "cities_service_role"
        ON "cities" FOR ALL TO service_role
        USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "cities_public_read" ON "cities";
    CREATE POLICY "cities_public_read"
        ON "cities" FOR SELECT TO authenticated
        USING (true);

    -- supplier_cities: read for authenticated, full for service_role
    DROP POLICY IF EXISTS "supplier_cities_service_role" ON "supplier_cities";
    CREATE POLICY "supplier_cities_service_role"
        ON "supplier_cities" FOR ALL TO service_role
        USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "supplier_cities_public_read" ON "supplier_cities";
    CREATE POLICY "supplier_cities_public_read"
        ON "supplier_cities" FOR SELECT TO authenticated
        USING (true);

    -- featured_items: read active for authenticated, full for service_role
    DROP POLICY IF EXISTS "featured_items_service_role" ON "featured_items";
    CREATE POLICY "featured_items_service_role"
        ON "featured_items" FOR ALL TO service_role
        USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "featured_items_public_read_active" ON "featured_items";
    CREATE POLICY "featured_items_public_read_active"
        ON "featured_items" FOR SELECT TO authenticated
        USING (is_active = true);

    -- featured_lists: read active for authenticated, full for service_role
    DROP POLICY IF EXISTS "featured_lists_service_role" ON "featured_lists";
    CREATE POLICY "featured_lists_service_role"
        ON "featured_lists" FOR ALL TO service_role
        USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "featured_lists_public_read_active" ON "featured_lists";
    CREATE POLICY "featured_lists_public_read_active"
        ON "featured_lists" FOR SELECT TO authenticated
        USING (is_active = true);

    -- featured_list_items: read for authenticated, full for service_role
    DROP POLICY IF EXISTS "featured_list_items_service_role" ON "featured_list_items";
    CREATE POLICY "featured_list_items_service_role"
        ON "featured_list_items" FOR ALL TO service_role
        USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "featured_list_items_public_read" ON "featured_list_items";
    CREATE POLICY "featured_list_items_public_read"
        ON "featured_list_items" FOR SELECT TO authenticated
        USING (true);

    -- master_products: read for authenticated, full for service_role
    DROP POLICY IF EXISTS "master_products_service_role" ON "master_products";
    CREATE POLICY "master_products_service_role"
        ON "master_products" FOR ALL TO service_role
        USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "master_products_public_read" ON "master_products";
    CREATE POLICY "master_products_public_read"
        ON "master_products" FOR SELECT TO authenticated
        USING (true);

END $$;

COMMIT;
