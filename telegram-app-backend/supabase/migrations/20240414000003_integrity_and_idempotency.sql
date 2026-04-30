-- Data integrity checks (NOT VALID to avoid blocking existing data)
ALTER TABLE "products"
    ADD CONSTRAINT "products_price_nonnegative" CHECK ("price" >= 0) NOT VALID,
    ADD CONSTRAINT "products_discount_price_valid"
        CHECK ("discount_price" IS NULL OR ("discount_price" >= 0 AND "discount_price" <= "price")) NOT VALID,
    ADD CONSTRAINT "products_stock_nonnegative" CHECK ("stock_level" >= 0) NOT VALID;

ALTER TABLE "cart_items"
    ADD CONSTRAINT "cart_items_quantity_positive" CHECK ("quantity" >= 1) NOT VALID;

ALTER TABLE "orders"
    ADD CONSTRAINT "orders_total_amount_nonnegative" CHECK ("total_amount" >= 0) NOT VALID;

ALTER TABLE "order_items"
    ADD CONSTRAINT "order_items_quantity_positive" CHECK ("quantity" >= 1) NOT VALID,
    ADD CONSTRAINT "order_items_price_nonnegative" CHECK ("price_at_time_of_order" >= 0) NOT VALID;

ALTER TABLE "deals"
    ADD CONSTRAINT "deals_discount_percentage_valid"
        CHECK ("discount_percentage" IS NULL OR ("discount_percentage" >= 0 AND "discount_percentage" <= 100)) NOT VALID,
    ADD CONSTRAINT "deals_date_range_valid"
        CHECK ("start_date" IS NULL OR "end_date" IS NULL OR "start_date" <= "end_date") NOT VALID;

-- Idempotency keys for critical write operations (orders, payments, etc.)
CREATE TABLE IF NOT EXISTS "idempotency_keys" (
    "id" BIGSERIAL PRIMARY KEY,
    "user_id" BIGINT NOT NULL,
    "scope" VARCHAR(64) NOT NULL,
    "idempotency_key" VARCHAR(128) NOT NULL,
    "request_hash" CHAR(64) NOT NULL,
    "status" VARCHAR(16) NOT NULL DEFAULT 'in_progress',
    "response_status" INTEGER,
    "response_body" JSONB,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "completed_at" TIMESTAMPTZ,
    "expires_at" TIMESTAMPTZ NOT NULL,
    CONSTRAINT "idempotency_keys_status_valid" CHECK ("status" IN ('in_progress', 'completed'))
);

CREATE UNIQUE INDEX IF NOT EXISTS "idempotency_keys_unique"
    ON "idempotency_keys" ("user_id", "scope", "idempotency_key");

CREATE INDEX IF NOT EXISTS "idempotency_keys_expires_at_idx"
    ON "idempotency_keys" ("expires_at");
