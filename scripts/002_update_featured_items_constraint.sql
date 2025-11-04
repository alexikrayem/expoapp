BEGIN;

-- Update the CHECK constraint on featured_items to include 'list'
ALTER TABLE featured_items 
DROP CONSTRAINT IF EXISTS featured_items_item_type_check;

ALTER TABLE featured_items
ADD CONSTRAINT featured_items_item_type_check 
CHECK (item_type IN ('product', 'deal', 'supplier', 'list'));

COMMIT;

-- Verify the constraint was updated
SELECT constraint_name, constraint_type 
FROM information_schema.table_constraints 
WHERE table_name = 'featured_items' 
AND constraint_name = 'featured_items_item_type_check';
