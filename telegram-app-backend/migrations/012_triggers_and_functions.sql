-- Migration 012: Triggers and Function Security Hardening
-- Per database-schema-designer skill: "Timestamps everywhere — updated_at on every table"
-- Per supabase skill: "Do not put security definer functions in an exposed schema"
-- Per supabase-postgres-best-practices: set search_path on all functions

BEGIN;

-- ============================================================
-- 1. Fix search_path on all app_private functions
--    Prevents search_path injection attacks.
-- ============================================================

CREATE OR REPLACE FUNCTION app_private.jwt_claim(claim_name TEXT)
RETURNS TEXT
LANGUAGE sql
STABLE
SET search_path = ''
AS $$
    SELECT NULLIF((current_setting('request.jwt.claims', true)::jsonb ->> claim_name), '');
$$;

CREATE OR REPLACE FUNCTION app_private.request_user_id()
RETURNS BIGINT
LANGUAGE plpgsql
STABLE
SET search_path = ''
AS $$
DECLARE
    claim_value TEXT;
BEGIN
    claim_value := COALESCE(
        app_private.jwt_claim('user_id'),
        app_private.jwt_claim('userId'),
        app_private.jwt_claim('sub')
    );

    IF claim_value IS NULL OR claim_value !~ '^[0-9]+$' THEN
        RETURN NULL;
    END IF;

    RETURN claim_value::BIGINT;
END
$$;

CREATE OR REPLACE FUNCTION app_private.request_role()
RETURNS TEXT
LANGUAGE sql
STABLE
SET search_path = ''
AS $$
    SELECT lower(COALESCE(app_private.jwt_claim('role'), app_private.jwt_claim('app_role')));
$$;

-- ============================================================
-- 2. Reusable updated_at trigger function
-- ============================================================

CREATE OR REPLACE FUNCTION app_private.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

-- ============================================================
-- 3. Apply updated_at trigger to all tables with an updated_at column
--    Uses DROP IF EXISTS + CREATE for idempotency.
-- ============================================================

-- products
DROP TRIGGER IF EXISTS trg_set_updated_at ON "products";
CREATE TRIGGER trg_set_updated_at
    BEFORE UPDATE ON "products"
    FOR EACH ROW EXECUTE FUNCTION app_private.set_updated_at();

-- suppliers
DROP TRIGGER IF EXISTS trg_set_updated_at ON "suppliers";
CREATE TRIGGER trg_set_updated_at
    BEFORE UPDATE ON "suppliers"
    FOR EACH ROW EXECUTE FUNCTION app_private.set_updated_at();

-- deals
DROP TRIGGER IF EXISTS trg_set_updated_at ON "deals";
CREATE TRIGGER trg_set_updated_at
    BEFORE UPDATE ON "deals"
    FOR EACH ROW EXECUTE FUNCTION app_private.set_updated_at();

-- delivery_agents
DROP TRIGGER IF EXISTS trg_set_updated_at ON "delivery_agents";
CREATE TRIGGER trg_set_updated_at
    BEFORE UPDATE ON "delivery_agents"
    FOR EACH ROW EXECUTE FUNCTION app_private.set_updated_at();

-- featured_items
DROP TRIGGER IF EXISTS trg_set_updated_at ON "featured_items";
CREATE TRIGGER trg_set_updated_at
    BEFORE UPDATE ON "featured_items"
    FOR EACH ROW EXECUTE FUNCTION app_private.set_updated_at();

-- featured_lists
DROP TRIGGER IF EXISTS trg_set_updated_at ON "featured_lists";
CREATE TRIGGER trg_set_updated_at
    BEFORE UPDATE ON "featured_lists"
    FOR EACH ROW EXECUTE FUNCTION app_private.set_updated_at();

-- user_profiles
DROP TRIGGER IF EXISTS trg_set_updated_at ON "user_profiles";
CREATE TRIGGER trg_set_updated_at
    BEFORE UPDATE ON "user_profiles"
    FOR EACH ROW EXECUTE FUNCTION app_private.set_updated_at();

-- master_products
DROP TRIGGER IF EXISTS trg_set_updated_at ON "master_products";
CREATE TRIGGER trg_set_updated_at
    BEFORE UPDATE ON "master_products"
    FOR EACH ROW EXECUTE FUNCTION app_private.set_updated_at();

-- pending_notifications
DROP TRIGGER IF EXISTS trg_set_updated_at ON "pending_notifications";
CREATE TRIGGER trg_set_updated_at
    BEFORE UPDATE ON "pending_notifications"
    FOR EACH ROW EXECUTE FUNCTION app_private.set_updated_at();

-- idempotency_keys
DROP TRIGGER IF EXISTS trg_set_updated_at ON "idempotency_keys";
CREATE TRIGGER trg_set_updated_at
    BEFORE UPDATE ON "idempotency_keys"
    FOR EACH ROW EXECUTE FUNCTION app_private.set_updated_at();

-- ============================================================
-- 4. tsv (tsvector) auto-update triggers
--    Products, suppliers, and deals have tsv columns but no trigger
--    to keep them in sync with the source text columns.
-- ============================================================

-- Products: tsv from name + description + category
CREATE OR REPLACE FUNCTION app_private.products_tsv_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
    NEW.tsv :=
        setweight(to_tsvector('simple', COALESCE(NEW.name, '')), 'A') ||
        setweight(to_tsvector('simple', COALESCE(NEW.description, '')), 'B') ||
        setweight(to_tsvector('simple', COALESCE(NEW.category, '')), 'C');
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_products_tsv ON "products";
CREATE TRIGGER trg_products_tsv
    BEFORE INSERT OR UPDATE OF name, description, category ON "products"
    FOR EACH ROW EXECUTE FUNCTION app_private.products_tsv_update();

-- Suppliers: tsv from name + category + description
CREATE OR REPLACE FUNCTION app_private.suppliers_tsv_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
    NEW.tsv :=
        setweight(to_tsvector('simple', COALESCE(NEW.name, '')), 'A') ||
        setweight(to_tsvector('simple', COALESCE(NEW.category, '')), 'B') ||
        setweight(to_tsvector('simple', COALESCE(NEW.description, '')), 'C');
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_suppliers_tsv ON "suppliers";
CREATE TRIGGER trg_suppliers_tsv
    BEFORE INSERT OR UPDATE OF name, category, description ON "suppliers"
    FOR EACH ROW EXECUTE FUNCTION app_private.suppliers_tsv_update();

-- Deals: tsv from title + description
CREATE OR REPLACE FUNCTION app_private.deals_tsv_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
    NEW.tsv :=
        setweight(to_tsvector('simple', COALESCE(NEW.title, '')), 'A') ||
        setweight(to_tsvector('simple', COALESCE(NEW.description, '')), 'B');
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_deals_tsv ON "deals";
CREATE TRIGGER trg_deals_tsv
    BEFORE INSERT OR UPDATE OF title, description ON "deals"
    FOR EACH ROW EXECUTE FUNCTION app_private.deals_tsv_update();

COMMIT;
