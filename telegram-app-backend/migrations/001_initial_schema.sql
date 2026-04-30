-- CreateTable
CREATE TABLE "admins" (
    "id" SERIAL NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "password_hash" TEXT NOT NULL,
    "full_name" VARCHAR(255),
    "role" VARCHAR(50) DEFAULT 'admin',
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "last_login" TIMESTAMPTZ(6),

    CONSTRAINT "admins_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cart_items" (
    "id" SERIAL NOT NULL,
    "user_id" BIGINT NOT NULL,
    "product_id" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1 CHECK ("quantity" > 0),
    "added_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cart_items_pkey" PRIMARY KEY ("user_id","product_id")
);

-- CreateTable
CREATE TABLE "cities" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "deals" (
    "id" SERIAL NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "discount_percentage" DECIMAL(5,2) CHECK ("discount_percentage" >= 0 AND "discount_percentage" <= 100),
    "start_date" DATE,
    "end_date" DATE,
    "product_id" INTEGER,
    "supplier_id" INTEGER,
    "image_url" TEXT,
    "is_active" BOOLEAN DEFAULT true,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "tsv" tsvector,
    "updated_at" TIMESTAMPTZ(6),

    CONSTRAINT "deals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "delivery_agents" (
    "id" SERIAL NOT NULL,
    "supplier_id" INTEGER NOT NULL,
    "full_name" VARCHAR(255) NOT NULL,
    "phone_number" VARCHAR(50) NOT NULL,
    "email" VARCHAR(255),
    "password_hash" TEXT NOT NULL,
    "telegram_user_id" BIGINT,
    "is_active" BOOLEAN DEFAULT true,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "delivery_agents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "featured_items" (
    "id" SERIAL NOT NULL,
    "item_type" VARCHAR(50) NOT NULL,
    "item_id" INTEGER NOT NULL,
    "display_order" INTEGER DEFAULT 0,
    "custom_title" VARCHAR(255),
    "custom_description" TEXT,
    "custom_image_url" TEXT,
    "is_active" BOOLEAN DEFAULT true,
    "active_from" TIMESTAMPTZ(6),
    "active_until" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "featured_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "featured_list_items" (
    "id" SERIAL NOT NULL,
    "featured_list_id" INTEGER NOT NULL,
    "item_type" VARCHAR(50) NOT NULL,
    "item_id" INTEGER NOT NULL,
    "display_order" INTEGER DEFAULT 0,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "featured_list_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "featured_lists" (
    "id" SERIAL NOT NULL,
    "list_name" VARCHAR(255) NOT NULL,
    "list_type" VARCHAR(50) NOT NULL,
    "description" TEXT,
    "custom_image_url" TEXT,
    "is_active" BOOLEAN DEFAULT true,
    "display_order" INTEGER DEFAULT 0,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "created_by" INTEGER,

    CONSTRAINT "featured_lists_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "master_products" (
    "id" SERIAL NOT NULL,
    "standardized_name_normalized" TEXT NOT NULL,
    "display_name" TEXT,
    "description" TEXT,
    "image_url" TEXT,
    "brand" TEXT,
    "category" TEXT,
    "attributes" JSONB,
    "current_demand_score" DECIMAL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "current_price_adjustment_percentage" DECIMAL(7,4) NOT NULL DEFAULT 0.0 CHECK ("current_price_adjustment_percentage" >= -0.10 AND "current_price_adjustment_percentage" <= 0.10),
    "last_adjustment_update" TIMESTAMPTZ(6),
    "initial_seed_price" DECIMAL(12,2),

    CONSTRAINT "master_products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_items" (
    "id" SERIAL NOT NULL,
    "order_id" INTEGER NOT NULL,
    "product_id" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL CHECK ("quantity" > 0),
    "price_at_time_of_order" DECIMAL(10,2) NOT NULL CHECK ("price_at_time_of_order" >= 0),
    "supplier_item_status" VARCHAR(50) DEFAULT 'pending',
    "assigned_delivery_agent_id" INTEGER,
    "delivery_item_status" VARCHAR(50) DEFAULT 'pending_assignment',
    "delivery_notes" TEXT,
    "item_payment_collected" BOOLEAN DEFAULT false,
    "item_delivered_at" TIMESTAMPTZ(6),

    CONSTRAINT "order_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "orders" (
    "id" SERIAL NOT NULL,
    "user_id" BIGINT NOT NULL,
    "total_amount" DECIMAL(12,2) NOT NULL CHECK ("total_amount" >= 0),
    "status" VARCHAR(50) DEFAULT 'pending',
    "order_date" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "delivery_status" VARCHAR(50) DEFAULT 'awaiting_fulfillment',

    CONSTRAINT "orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "otp_verifications" (
    "phone_number" VARCHAR(20) NOT NULL,
    "code" VARCHAR(6) NOT NULL,
    "expires_at" TIMESTAMP(6) NOT NULL,
    "attempts" INTEGER DEFAULT 0,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "otp_verifications_pkey" PRIMARY KEY ("phone_number")
);

-- CreateTable
CREATE TABLE "products" (
    "id" SERIAL NOT NULL,
    "supplier_id" INTEGER NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "price" DECIMAL(10,2) NOT NULL CHECK ("price" >= 0),
    "discount_price" DECIMAL(10,2) CHECK ("discount_price" >= 0),
    "category" VARCHAR(100),
    "image_url" TEXT,
    "is_on_sale" BOOLEAN DEFAULT false,
    "stock_level" INTEGER DEFAULT 0 CHECK ("stock_level" >= 0),
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "tsv" tsvector,
    "updated_at" TIMESTAMPTZ(6),
    "standardized_name_input" TEXT,
    "master_product_id" INTEGER,
    "linking_status" VARCHAR(50) DEFAULT 'pending',

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refresh_tokens" (
    "id" BIGSERIAL NOT NULL,
    "subject_id" BIGINT NOT NULL,
    "role" VARCHAR(32) NOT NULL,
    "token_hash" VARCHAR(64) NOT NULL,
    "jti" VARCHAR(36) NOT NULL,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "revoked_at" TIMESTAMPTZ(6),
    "replaced_by" VARCHAR(36),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_used_at" TIMESTAMPTZ(6),
    "ip" VARCHAR(64),
    "user_agent" VARCHAR(255),

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "supplier_cities" (
    "supplier_id" INTEGER NOT NULL,
    "city_id" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "supplier_cities_pkey" PRIMARY KEY ("supplier_id","city_id")
);

-- CreateTable
CREATE TABLE "suppliers" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "category" VARCHAR(100),
    "location" VARCHAR(100),
    "rating" DECIMAL(3,1),
    "image_url" TEXT,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "tsv" tsvector,
    "description" TEXT,
    "email" VARCHAR(255),
    "password_hash" TEXT,
    "is_active" BOOLEAN DEFAULT true,
    "updated_at" TIMESTAMPTZ(6),

    CONSTRAINT "suppliers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_favorites" (
    "user_id" BIGINT NOT NULL,
    "product_id" INTEGER NOT NULL,
    "added_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_favorites_pkey" PRIMARY KEY ("user_id","product_id")
);

-- CreateTable
CREATE TABLE "user_profiles" (
    "user_id" BIGINT NOT NULL,
    "full_name" VARCHAR(255),
    "phone_number" VARCHAR(50),
    "address_line1" TEXT NOT NULL,
    "address_line2" TEXT,
    "city" VARCHAR(100) NOT NULL,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "selected_city_id" INTEGER,
    "clinic_name" VARCHAR(255),
    "clinic_phone" VARCHAR(20),
    "clinic_address_line1" VARCHAR(255),
    "clinic_address_line2" VARCHAR(255),
    "clinic_city" VARCHAR(100),
    "clinic_country" VARCHAR(100),
    "clinic_coordinates" JSONB,
    "clinic_license_number" VARCHAR(100),
    "clinic_specialization" VARCHAR(100),
    "professional_role" VARCHAR(100),
    "years_of_experience" INTEGER,
    "education_background" TEXT,
    "date_of_birth" DATE,
    "gender" VARCHAR(20),
    "professional_license_number" VARCHAR(100),
    "profile_completed" BOOLEAN DEFAULT false,

    CONSTRAINT "user_profiles_pkey" PRIMARY KEY ("user_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "admins_email_key" ON "admins"("email");

-- CreateIndex
CREATE INDEX "idx_cart_items_product_id" ON "cart_items"("product_id");

-- CreateIndex
CREATE INDEX "idx_cart_items_user_id" ON "cart_items"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "cart_items_user_id_product_id_key" ON "cart_items"("user_id", "product_id");

-- CreateIndex
CREATE UNIQUE INDEX "cities_name_key" ON "cities"("name");

-- CreateIndex
CREATE INDEX "deals_description_trgm_idx" ON "deals" USING GIN ("description" gin_trgm_ops);

-- CreateIndex
CREATE INDEX "deals_title_trgm_idx" ON "deals" USING GIN ("title" gin_trgm_ops);

-- CreateIndex
CREATE INDEX "deals_tsv_idx" ON "deals" USING GIN ("tsv");


-- CreateIndex
CREATE INDEX "idx_deals_is_active" ON "deals"("is_active");

-- CreateIndex
CREATE INDEX "idx_deals_supplier_created_at" ON "deals"("supplier_id", "created_at" DESC);


-- CreateIndex
CREATE UNIQUE INDEX "delivery_agents_phone_number_key" ON "delivery_agents"("phone_number");

-- CreateIndex
CREATE UNIQUE INDEX "delivery_agents_email_key" ON "delivery_agents"("email");

-- CreateIndex
CREATE UNIQUE INDEX "delivery_agents_telegram_user_id_key" ON "delivery_agents"("telegram_user_id");

-- CreateIndex
CREATE INDEX "idx_delivery_agents_email" ON "delivery_agents"("email");

-- CreateIndex
CREATE INDEX "idx_delivery_agents_is_active" ON "delivery_agents"("is_active");

-- CreateIndex
CREATE INDEX "idx_delivery_agents_phone_number" ON "delivery_agents"("phone_number");

-- CreateIndex
CREATE INDEX "idx_delivery_agents_supplier_active" ON "delivery_agents"("supplier_id", "is_active");

-- CreateIndex
CREATE INDEX "idx_delivery_agents_supplier_id" ON "delivery_agents"("supplier_id");

-- CreateIndex
CREATE INDEX "idx_delivery_agents_telegram_user_id" ON "delivery_agents"("telegram_user_id");

-- CreateIndex
CREATE INDEX "idx_featured_items_active_order" ON "featured_items"("is_active", "display_order", "active_from", "active_until");

-- CreateIndex
CREATE INDEX "idx_featured_items_type_id" ON "featured_items"("item_type", "item_id");

-- CreateIndex
CREATE INDEX "idx_featured_list_items_featured_list_id" ON "featured_list_items"("featured_list_id");

-- CreateIndex
CREATE INDEX "idx_featured_list_items_item_type_id" ON "featured_list_items"("item_type", "item_id");

-- CreateIndex
CREATE UNIQUE INDEX "featured_list_items_featured_list_id_item_type_item_id_key" ON "featured_list_items"("featured_list_id", "item_type", "item_id");

-- CreateIndex
CREATE INDEX "idx_featured_lists_is_active" ON "featured_lists"("is_active");

-- CreateIndex
CREATE INDEX "idx_featured_lists_list_type" ON "featured_lists"("list_type");

-- CreateIndex
CREATE UNIQUE INDEX "master_products_standardized_name_normalized_key" ON "master_products"("standardized_name_normalized");

-- CreateIndex
CREATE INDEX "idx_master_products_display_name" ON "master_products"("display_name");

-- CreateIndex
CREATE INDEX "idx_master_products_std_name_trgm" ON "master_products" USING GIN ("standardized_name_normalized" gin_trgm_ops);

-- CreateIndex
CREATE INDEX "idx_order_items_assigned_agent" ON "order_items"("assigned_delivery_agent_id");

-- CreateIndex
CREATE INDEX "idx_order_items_delivery_status" ON "order_items"("delivery_item_status");

-- CreateIndex
CREATE INDEX "idx_order_items_order_id" ON "order_items"("order_id");

-- CreateIndex
CREATE INDEX "idx_order_items_product_id" ON "order_items"("product_id");

-- CreateIndex
CREATE INDEX "idx_order_items_order_product" ON "order_items"("order_id", "product_id");

-- CreateIndex
CREATE INDEX "idx_order_items_supplier_status" ON "order_items"("supplier_item_status");

-- CreateIndex
CREATE INDEX "idx_orders_delivery_status" ON "orders"("delivery_status");

-- CreateIndex
CREATE INDEX "idx_orders_status" ON "orders"("status");

-- CreateIndex
CREATE INDEX "idx_orders_user_id" ON "orders"("user_id");

-- CreateIndex
CREATE INDEX "idx_orders_user_order_date" ON "orders"("user_id", "order_date" DESC);

-- CreateIndex
CREATE INDEX "idx_otp_verifications_phone" ON "otp_verifications"("phone_number");

-- CreateIndex
CREATE INDEX "idx_products_category" ON "products"("category");


-- CreateIndex
CREATE INDEX "idx_products_linking_status" ON "products"("linking_status");

-- CreateIndex
CREATE INDEX "idx_products_master_product_id" ON "products"("master_product_id");


-- CreateIndex
CREATE INDEX "idx_products_standardized_name" ON "products"("standardized_name_input");

-- CreateIndex
CREATE INDEX "idx_products_standardized_name_trgm" ON "products" USING GIN ("standardized_name_input" gin_trgm_ops);


-- CreateIndex
CREATE INDEX "idx_products_supplier_created_at" ON "products"("supplier_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "idx_products_supplier_id" ON "products"("supplier_id");

-- CreateIndex
CREATE INDEX "products_category_trgm_idx" ON "products" USING GIN ("category" gin_trgm_ops);

-- CreateIndex
CREATE INDEX "products_description_trgm_idx" ON "products" USING GIN ("description" gin_trgm_ops);

-- CreateIndex
CREATE INDEX "products_name_trgm_idx" ON "products" USING GIN ("name" gin_trgm_ops);

-- CreateIndex
CREATE INDEX "products_tsv_idx" ON "products" USING GIN ("tsv");

-- CreateIndex
CREATE UNIQUE INDEX "refresh_tokens_token_hash_key" ON "refresh_tokens"("token_hash");

-- CreateIndex
CREATE UNIQUE INDEX "refresh_tokens_jti_key" ON "refresh_tokens"("jti");

-- CreateIndex
CREATE INDEX "idx_refresh_tokens_expires_at" ON "refresh_tokens"("expires_at");

-- CreateIndex
CREATE INDEX "idx_refresh_tokens_subject_role" ON "refresh_tokens"("subject_id", "role");

-- CreateIndex
CREATE INDEX "idx_supplier_cities_city_supplier" ON "supplier_cities"("city_id", "supplier_id");

-- CreateIndex
CREATE INDEX "idx_supplier_cities_supplier_city" ON "supplier_cities"("supplier_id", "city_id");

-- CreateIndex
CREATE UNIQUE INDEX "idx_suppliers_email" ON "suppliers"("email");


-- CreateIndex
CREATE INDEX "idx_suppliers_is_active" ON "suppliers"("is_active");


-- CreateIndex
CREATE INDEX "suppliers_category_trgm_idx" ON "suppliers" USING GIN ("category" gin_trgm_ops);

-- CreateIndex
CREATE INDEX "suppliers_name_trgm_idx" ON "suppliers" USING GIN ("name" gin_trgm_ops);

-- CreateIndex
CREATE INDEX "suppliers_tsv_idx" ON "suppliers" USING GIN ("tsv");

-- CreateIndex
CREATE INDEX "idx_user_favorites_product_id" ON "user_favorites"("product_id");

-- CreateIndex
CREATE INDEX "idx_user_favorites_user_id" ON "user_favorites"("user_id");

-- CreateIndex
CREATE INDEX "idx_user_profiles_profile_completed" ON "user_profiles"("profile_completed");

-- AddForeignKey
ALTER TABLE "cart_items" ADD CONSTRAINT "cart_items_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user_profiles"("user_id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "cart_items" ADD CONSTRAINT "cart_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "deals" ADD CONSTRAINT "deals_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "deals" ADD CONSTRAINT "deals_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "suppliers"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "delivery_agents" ADD CONSTRAINT "delivery_agents_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "suppliers"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "featured_list_items" ADD CONSTRAINT "featured_list_items_featured_list_id_fkey" FOREIGN KEY ("featured_list_id") REFERENCES "featured_lists"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "featured_lists" ADD CONSTRAINT "featured_lists_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "admins"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "fk_order" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "fk_product" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_assigned_delivery_agent_id_fkey" FOREIGN KEY ("assigned_delivery_agent_id") REFERENCES "delivery_agents"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "fk_user" FOREIGN KEY ("user_id") REFERENCES "user_profiles"("user_id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_master_product_id_fkey" FOREIGN KEY ("master_product_id") REFERENCES "master_products"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "suppliers"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "supplier_cities" ADD CONSTRAINT "supplier_cities_city_id_fkey" FOREIGN KEY ("city_id") REFERENCES "cities"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "supplier_cities" ADD CONSTRAINT "supplier_cities_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "suppliers"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "user_favorites" ADD CONSTRAINT "fk_product_fav" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "user_favorites" ADD CONSTRAINT "fk_user_profile_fav" FOREIGN KEY ("user_id") REFERENCES "user_profiles"("user_id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- CreateTable
CREATE TABLE "audit_events" (
    "id" BIGSERIAL NOT NULL,
    "event_type" VARCHAR(100) NOT NULL,
    "actor_role" VARCHAR(50),
    "actor_id" BIGINT,
    "target_type" VARCHAR(50),
    "target_id" BIGINT,
    "ip" INET,
    "user_agent" VARCHAR(255),
    "request_id" VARCHAR(64),
    "metadata" JSONB,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idx_audit_events_type_created" ON "audit_events"("event_type", "created_at" DESC);

-- CreateTable
CREATE TABLE "pending_notifications" (
    "id" SERIAL NOT NULL,
    "order_id" INTEGER NOT NULL,
    "type" VARCHAR(100) NOT NULL,
    "status" VARCHAR(50) DEFAULT 'pending',
    "payload" JSONB,
    "available_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pending_notifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idx_pending_notifications_status_available" ON "pending_notifications"("status", "available_at");
CREATE INDEX "idx_pending_notifications_order_status" ON "pending_notifications"("order_id", "status");

-- AddForeignKey
ALTER TABLE "pending_notifications" ADD CONSTRAINT "pending_notifications_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- CreateTable
CREATE TABLE "idempotency_keys" (
    "id" SERIAL NOT NULL,
    "user_id" BIGINT NOT NULL,
    "scope" VARCHAR(100) NOT NULL,
    "idempotency_key" VARCHAR(255) NOT NULL,
    "request_hash" VARCHAR(64) NOT NULL,
    "status" VARCHAR(50) NOT NULL DEFAULT 'in_progress',
    "response_status" INTEGER,
    "response_body" JSONB,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMPTZ(6),

    CONSTRAINT "idempotency_keys_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "idx_idempotency_user_scope_key" ON "idempotency_keys"("user_id", "scope", "idempotency_key");
CREATE INDEX "idx_idempotency_expires_at" ON "idempotency_keys"("expires_at");

