-- Authentication hardening: OTP storage, phone uniqueness, and Supabase RLS baseline.

-- OTP values are now stored as HMAC hashes (hex), not plaintext 6-digit codes.
ALTER TABLE "otp_verifications"
    ALTER COLUMN "code" TYPE VARCHAR(128);

-- Enforce uniqueness on normalized phone numbers.
-- We fail loudly if existing data already has duplicates after normalization.
DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM (
            SELECT regexp_replace(phone_number, '[^0-9]', '', 'g') AS phone_norm,
                   COUNT(*) AS duplicate_count
            FROM "user_profiles"
            WHERE phone_number IS NOT NULL
              AND btrim(phone_number) <> ''
            GROUP BY 1
            HAVING COUNT(*) > 1
        ) duplicates
    ) THEN
        RAISE EXCEPTION 'Cannot enforce normalized phone uniqueness: duplicate phone_number values exist in user_profiles after normalization.';
    END IF;
END
$$;

CREATE UNIQUE INDEX IF NOT EXISTS "idx_user_profiles_phone_number_norm_unique"
    ON "user_profiles" (regexp_replace(phone_number, '[^0-9]', '', 'g'))
    WHERE phone_number IS NOT NULL
      AND btrim(phone_number) <> '';

-- Supabase-aware RLS baseline (applied only when Supabase roles exist).
CREATE SCHEMA IF NOT EXISTS app_private;

CREATE OR REPLACE FUNCTION app_private.jwt_claim(claim_name TEXT)
RETURNS TEXT
LANGUAGE sql
STABLE
AS $$
    SELECT NULLIF((current_setting('request.jwt.claims', true)::jsonb ->> claim_name), '');
$$;

CREATE OR REPLACE FUNCTION app_private.request_user_id()
RETURNS BIGINT
LANGUAGE plpgsql
STABLE
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
AS $$
    SELECT lower(COALESCE(app_private.jwt_claim('role'), app_private.jwt_claim('app_role')));
$$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated')
       OR NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
        RAISE NOTICE 'Skipping Supabase RLS baseline: roles authenticated/service_role were not found.';
        RETURN;
    END IF;

    ALTER TABLE "user_profiles" ENABLE ROW LEVEL SECURITY;
    ALTER TABLE "cart_items" ENABLE ROW LEVEL SECURITY;
    ALTER TABLE "user_favorites" ENABLE ROW LEVEL SECURITY;
    ALTER TABLE "orders" ENABLE ROW LEVEL SECURITY;
    ALTER TABLE "order_items" ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "user_profiles_service_role" ON "user_profiles";
    DROP POLICY IF EXISTS "user_profiles_customer_select_self" ON "user_profiles";
    DROP POLICY IF EXISTS "user_profiles_customer_insert_self" ON "user_profiles";
    DROP POLICY IF EXISTS "user_profiles_customer_update_self" ON "user_profiles";

    CREATE POLICY "user_profiles_service_role"
        ON "user_profiles"
        FOR ALL
        TO service_role
        USING (true)
        WITH CHECK (true);

    CREATE POLICY "user_profiles_customer_select_self"
        ON "user_profiles"
        FOR SELECT
        TO authenticated
        USING (user_id = app_private.request_user_id());

    CREATE POLICY "user_profiles_customer_insert_self"
        ON "user_profiles"
        FOR INSERT
        TO authenticated
        WITH CHECK (
            user_id = app_private.request_user_id()
            AND COALESCE(app_private.request_role(), '') = 'customer'
        );

    CREATE POLICY "user_profiles_customer_update_self"
        ON "user_profiles"
        FOR UPDATE
        TO authenticated
        USING (user_id = app_private.request_user_id())
        WITH CHECK (user_id = app_private.request_user_id());

    DROP POLICY IF EXISTS "cart_items_service_role" ON "cart_items";
    DROP POLICY IF EXISTS "cart_items_customer_own_rows" ON "cart_items";

    CREATE POLICY "cart_items_service_role"
        ON "cart_items"
        FOR ALL
        TO service_role
        USING (true)
        WITH CHECK (true);

    CREATE POLICY "cart_items_customer_own_rows"
        ON "cart_items"
        FOR ALL
        TO authenticated
        USING (user_id = app_private.request_user_id())
        WITH CHECK (user_id = app_private.request_user_id());

    DROP POLICY IF EXISTS "user_favorites_service_role" ON "user_favorites";
    DROP POLICY IF EXISTS "user_favorites_customer_own_rows" ON "user_favorites";

    CREATE POLICY "user_favorites_service_role"
        ON "user_favorites"
        FOR ALL
        TO service_role
        USING (true)
        WITH CHECK (true);

    CREATE POLICY "user_favorites_customer_own_rows"
        ON "user_favorites"
        FOR ALL
        TO authenticated
        USING (user_id = app_private.request_user_id())
        WITH CHECK (user_id = app_private.request_user_id());

    DROP POLICY IF EXISTS "orders_service_role" ON "orders";
    DROP POLICY IF EXISTS "orders_customer_own_rows" ON "orders";

    CREATE POLICY "orders_service_role"
        ON "orders"
        FOR ALL
        TO service_role
        USING (true)
        WITH CHECK (true);

    CREATE POLICY "orders_customer_own_rows"
        ON "orders"
        FOR ALL
        TO authenticated
        USING (user_id = app_private.request_user_id())
        WITH CHECK (user_id = app_private.request_user_id());

    DROP POLICY IF EXISTS "order_items_service_role" ON "order_items";
    DROP POLICY IF EXISTS "order_items_customer_read_own_order_rows" ON "order_items";

    CREATE POLICY "order_items_service_role"
        ON "order_items"
        FOR ALL
        TO service_role
        USING (true)
        WITH CHECK (true);

    CREATE POLICY "order_items_customer_read_own_order_rows"
        ON "order_items"
        FOR SELECT
        TO authenticated
        USING (
            EXISTS (
                SELECT 1
                FROM "orders" o
                WHERE o.id = order_items.order_id
                  AND o.user_id = app_private.request_user_id()
            )
        );
END
$$;
