-- SQL commands to add clinic information and profile completion fields to the user_profiles table

-- Add new columns to the existing user_profiles table
ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS clinic_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS clinic_phone VARCHAR(20),
ADD COLUMN IF NOT EXISTS clinic_address_line1 VARCHAR(255),
ADD COLUMN IF NOT EXISTS clinic_address_line2 VARCHAR(255),
ADD COLUMN IF NOT EXISTS clinic_city VARCHAR(100),
ADD COLUMN IF NOT EXISTS clinic_country VARCHAR(100),
ADD COLUMN IF NOT EXISTS clinic_coordinates JSONB, -- For storing latitude/longitude as {"lat": 0.0, "lng": 0.0}
ADD COLUMN IF NOT EXISTS clinic_license_number VARCHAR(100),
ADD COLUMN IF NOT EXISTS clinic_specialization VARCHAR(100),
ADD COLUMN IF NOT EXISTS professional_role VARCHAR(100),
ADD COLUMN IF NOT EXISTS years_of_experience INTEGER,
ADD COLUMN IF NOT EXISTS education_background TEXT,
ADD COLUMN IF NOT EXISTS date_of_birth DATE,
ADD COLUMN IF NOT EXISTS gender VARCHAR(20),
ADD COLUMN IF NOT EXISTS professional_license_number VARCHAR(100),
ADD COLUMN IF NOT EXISTS profile_completed BOOLEAN DEFAULT FALSE;

-- Create an index on profile_completed for faster queries
CREATE INDEX IF NOT EXISTS idx_user_profiles_profile_completed ON user_profiles(profile_completed);

-- Update existing records to have profile_completed = TRUE where we have basic information
-- This will mark existing profiles as incomplete by default, so they'll go through the onboarding flow
-- If you want to preserve existing profiles, you can update them based on existing data
UPDATE user_profiles 
SET profile_completed = CASE 
  WHEN full_name IS NOT NULL AND full_name != '' 
    AND phone_number IS NOT NULL AND phone_number != ''
    AND clinic_name IS NOT NULL AND clinic_name != ''
    AND clinic_phone IS NOT NULL AND clinic_phone != ''
  THEN TRUE 
  ELSE FALSE 
END;

-- ------------------------------------------------------------
-- Refresh token rotation storage (security hardening)
-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS refresh_tokens (
  id BIGSERIAL PRIMARY KEY,
  subject_id BIGINT NOT NULL,
  role VARCHAR(32) NOT NULL,
  token_hash VARCHAR(64) NOT NULL UNIQUE,
  jti VARCHAR(36) NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ,
  replaced_by VARCHAR(36),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_used_at TIMESTAMPTZ,
  ip VARCHAR(64),
  user_agent VARCHAR(255)
);

CREATE INDEX IF NOT EXISTS idx_refresh_tokens_subject_role ON refresh_tokens(subject_id, role);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_expires_at ON refresh_tokens(expires_at);

-- ------------------------------------------------------------
-- Performance indexes (hot paths)
-- ------------------------------------------------------------

-- Core lookups and joins
CREATE INDEX IF NOT EXISTS idx_products_supplier_created_at ON products(supplier_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_products_master_product_id ON products(master_product_id);
CREATE INDEX IF NOT EXISTS idx_products_standardized_name ON products(standardized_name_input);
CREATE INDEX IF NOT EXISTS idx_suppliers_is_active ON suppliers(is_active);

CREATE INDEX IF NOT EXISTS idx_supplier_cities_city_supplier ON supplier_cities(city_id, supplier_id);
CREATE INDEX IF NOT EXISTS idx_supplier_cities_supplier_city ON supplier_cities(supplier_id, city_id);

CREATE INDEX IF NOT EXISTS idx_deals_supplier_created_at ON deals(supplier_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_deals_is_active ON deals(is_active);

CREATE INDEX IF NOT EXISTS idx_orders_user_order_date ON orders(user_id, order_date DESC);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_delivery_status ON orders(delivery_status);

CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product_id ON order_items(product_id);

CREATE INDEX IF NOT EXISTS idx_cart_items_user_id ON cart_items(user_id);
CREATE INDEX IF NOT EXISTS idx_user_favorites_user_id ON user_favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_otp_verifications_phone ON otp_verifications(phone_number);

CREATE INDEX IF NOT EXISTS idx_delivery_agents_supplier_active ON delivery_agents(supplier_id, is_active);

-- Fuzzy search (pg_trgm)
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX IF NOT EXISTS idx_products_name_trgm ON products USING GIN (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_products_description_trgm ON products USING GIN (description gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_products_standardized_trgm ON products USING GIN (standardized_name_input gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_suppliers_name_trgm ON suppliers USING GIN (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_suppliers_category_trgm ON suppliers USING GIN (category gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_deals_title_trgm ON deals USING GIN (title gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_deals_description_trgm ON deals USING GIN (description gin_trgm_ops);
