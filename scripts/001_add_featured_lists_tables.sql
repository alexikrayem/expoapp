-- =============================================================================
-- SQL MIGRATION: Add Featured Lists Support to Featured Items Slider
-- =============================================================================
-- This script creates tables and schema necessary to support product/deal lists
-- in the featured items slider.
--
-- Execute this script in your PostgreSQL database to enable the feature.
-- =============================================================================

BEGIN; -- Start transaction

-- Step 1: Create featured_lists table
CREATE TABLE IF NOT EXISTS featured_lists (
    id SERIAL PRIMARY KEY,
    list_name VARCHAR(255) NOT NULL,
    list_type VARCHAR(50) NOT NULL CHECK (list_type IN ('products', 'deals')),
    description TEXT,
    custom_image_url TEXT,
    is_active BOOLEAN DEFAULT true,
    display_order INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    created_by INT,
    FOREIGN KEY (created_by) REFERENCES admins(id) ON DELETE SET NULL
);

-- Step 2: Create featured_list_items table
CREATE TABLE IF NOT EXISTS featured_list_items (
    id SERIAL PRIMARY KEY,
    featured_list_id INT NOT NULL,
    item_type VARCHAR(50) NOT NULL CHECK (item_type IN ('product', 'deal')),
    item_id INT NOT NULL,
    display_order INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    FOREIGN KEY (featured_list_id) REFERENCES featured_lists(id) ON DELETE CASCADE,
    UNIQUE(featured_list_id, item_type, item_id)
);

-- Step 3: Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_featured_lists_is_active ON featured_lists(is_active);
CREATE INDEX IF NOT EXISTS idx_featured_lists_list_type ON featured_lists(list_type);
CREATE INDEX IF NOT EXISTS idx_featured_list_items_featured_list_id ON featured_list_items(featured_list_id);
CREATE INDEX IF NOT EXISTS idx_featured_list_items_item_type_id ON featured_list_items(item_type, item_id);

-- Step 4: Add column to featured_items_definitions if not exists (to support list type)
-- Check if the table exists and alter if needed
-- Step 4: Add column to featured_items if not exists (to support list type)
DO $$ 
BEGIN
    PERFORM 1 FROM information_schema.tables 
    WHERE table_name = 'featured_items';
    
    IF FOUND THEN
        RAISE NOTICE 'featured_items table exists. Ensure item_type CHECK constraint allows "list" value.';
    END IF;
END $$;


COMMIT; -- End transaction

-- =============================================================================
-- NOTES FOR RUNNING THIS SCRIPT:
-- =============================================================================
-- 1. Run this script in your PostgreSQL database:
--    psql -U your_db_user -d your_database -f scripts/001_add_featured_lists_tables.sql
--
-- 2. Ensure the 'admins' table exists (referenced by foreign key)
--
-- 3. After running this, you need to update your featured_items_definitions table:
--    ALTER TABLE featured_items_definitions 
--    DROP CONSTRAINT IF EXISTS featured_items_definitions_item_type_check;
--    
--    ALTER TABLE featured_items_definitions
--    ADD CONSTRAINT featured_items_definitions_item_type_check 
--    CHECK (item_type IN ('product', 'deal', 'supplier', 'list'));
--
-- 4. If you want to verify the tables were created:
--    \dt featured_lists
--    \dt featured_list_items
--    SELECT * FROM featured_lists;
--    SELECT * FROM featured_list_items;
--
-- =============================================================================
-- DATABASE STRUCTURE OVERVIEW:
-- =============================================================================
--
-- featured_lists:
--   - id: Unique identifier for each list
--   - list_name: Name of the list (e.g., "Summer Deals", "New Arrivals")
--   - list_type: Type of items in list ('products' or 'deals')
--   - description: Optional description
--   - custom_image_url: Image to show in slider for this list
--   - is_active: Whether list is active
--   - display_order: Order in which to display (lower = earlier)
--   - created_at / updated_at: Timestamps
--   - created_by: Admin ID who created this list
--
-- featured_list_items:
--   - id: Unique identifier for each item in list
--   - featured_list_id: Reference to which list this belongs to
--   - item_type: Type of item ('product' or 'deal')
--   - item_id: ID of the product or deal
--   - display_order: Order within the list
--   - created_at: When this item was added
--
-- featured_items_definitions (existing table, now supports 'list'):
--   - When item_type = 'list', item_id points to featured_lists.id
--   - This allows lists to be shown in the slider alongside individual items
--
-- =============================================================================
-- USAGE EXAMPLES:
-- =============================================================================
--
-- 1. Create a new list:
--    INSERT INTO featured_lists 
--    (list_name, list_type, description, custom_image_url, is_active, display_order)
--    VALUES ('Summer Sale', 'products', 'Best summer products', 'https://...', true, 1);
--
-- 2. Add items to the list:
--    INSERT INTO featured_list_items 
--    (featured_list_id, item_type, item_id, display_order)
--    VALUES (1, 'product', 5, 0);
--    INSERT INTO featured_list_items 
--    (featured_list_id, item_type, item_id, display_order)
--    VALUES (1, 'product', 10, 1);
--
-- 3. Add the list to featured items:
--    INSERT INTO featured_items_definitions
--    (item_type, item_id, custom_title, custom_image_url, display_order, is_active)
--    VALUES ('list', 1, 'Summer Deals', 'https://...', 0, true);
--
-- 4. Query to see all lists with their items:
--    SELECT fl.*, COUNT(fli.id) as item_count
--    FROM featured_lists fl
--    LEFT JOIN featured_list_items fli ON fl.id = fli.featured_list_id
--    GROUP BY fl.id;
--
-- =============================================================================

