const db = require('../config/db');

async function setupSearch() {
    try {
        console.log('Starting search setup...');

        // 1. Enable pg_trgm extension
        console.log('Enabling pg_trgm extension...');
        await db.query('CREATE EXTENSION IF NOT EXISTS pg_trgm;');

        // 2. Add Indexes for Products
        console.log('Adding indexes to products table...');
        await db.query(`
            CREATE INDEX IF NOT EXISTS idx_products_name_trgm ON products USING gin (name gin_trgm_ops);
            CREATE INDEX IF NOT EXISTS idx_products_description_trgm ON products USING gin (description gin_trgm_ops);
            CREATE INDEX IF NOT EXISTS idx_products_standardized_name_trgm ON products USING gin (standardized_name_input gin_trgm_ops);
        `);

        // 3. Add Indexes for Suppliers
        console.log('Adding indexes to suppliers table...');
        await db.query(`
            CREATE INDEX IF NOT EXISTS idx_suppliers_name_trgm ON suppliers USING gin (name gin_trgm_ops);
        `);

        // 4. Add Indexes for Deals
        console.log('Adding indexes to deals table...');
        await db.query(`
            CREATE INDEX IF NOT EXISTS idx_deals_title_trgm ON deals USING gin (title gin_trgm_ops);
            CREATE INDEX IF NOT EXISTS idx_deals_description_trgm ON deals USING gin (description gin_trgm_ops);
        `);

        console.log('Search setup completed successfully!');
        process.exit(0);
    } catch (error) {
        console.error('Error setting up search:', error);
        process.exit(1);
    }
}

setupSearch();
