const db = require('../config/db');

const SEARCH_SETUP_STEPS = [
    {
        label: 'Enabling pg_trgm extension...',
        sql: 'CREATE EXTENSION IF NOT EXISTS pg_trgm;',
    },
    {
        label: 'Adding indexes to products table...',
        sql: `
            CREATE INDEX IF NOT EXISTS idx_products_name_trgm ON products USING gin (name gin_trgm_ops);
            CREATE INDEX IF NOT EXISTS idx_products_description_trgm ON products USING gin (description gin_trgm_ops);
            CREATE INDEX IF NOT EXISTS idx_products_standardized_name_trgm ON products USING gin (standardized_name_input gin_trgm_ops);
        `,
    },
    {
        label: 'Adding indexes to suppliers table...',
        sql: `
            CREATE INDEX IF NOT EXISTS idx_suppliers_name_trgm ON suppliers USING gin (name gin_trgm_ops);
        `,
    },
    {
        label: 'Adding indexes to deals table...',
        sql: `
            CREATE INDEX IF NOT EXISTS idx_deals_title_trgm ON deals USING gin (title gin_trgm_ops);
            CREATE INDEX IF NOT EXISTS idx_deals_description_trgm ON deals USING gin (description gin_trgm_ops);
        `,
    },
];

async function executeSearchSetupSteps() {
    for (const step of SEARCH_SETUP_STEPS) {
        console.log(step.label);
        await db.query(step.sql);
    }
}

async function setupSearch() {
    try {
        console.log('Starting search setup...');
        await executeSearchSetupSteps();
        console.log('Search setup completed successfully!');
        process.exit(0);
    } catch (error) {
        console.error('Error setting up search:', error);
        process.exit(1);
    }
}

setupSearch();
