/**
 * Migration Runner — Executes migrations 007–014 sequentially
 * and runs verification queries afterward.
 */
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL.includes('localhost') ? false : { rejectUnauthorized: false },
});

const MIGRATIONS = [
    '007_rls_complete_hardening.sql',
    '008_schema_conflict_resolution.sql',
    '009_rls_performance.sql',
    '010_missing_fk_indexes.sql',
    '011_data_type_fixes.sql',
    '012_triggers_and_functions.sql',
    '013_index_optimization.sql',
    '014_constraint_cleanup.sql',
];

const VERIFICATIONS = [
    {
        name: 'RLS Status (all tables)',
        sql: `SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;`,
    },
    {
        name: 'RLS Policies',
        sql: `SELECT tablename, policyname, cmd, roles FROM pg_policies WHERE schemaname = 'public' ORDER BY tablename, policyname;`,
    },
    {
        name: 'Missing FK Indexes',
        sql: `SELECT conrelid::regclass AS table_name, a.attname AS fk_column
          FROM pg_constraint c
          JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = ANY(c.conkey)
          WHERE c.contype = 'f'
            AND NOT EXISTS (
              SELECT 1 FROM pg_index i
              WHERE i.indrelid = c.conrelid AND a.attnum = ANY(i.indkey)
            );`,
    },
    {
        name: 'Triggers',
        sql: `SELECT trigger_name, event_object_table, action_timing, event_manipulation
          FROM information_schema.triggers
          WHERE trigger_schema = 'public'
          ORDER BY event_object_table, trigger_name;`,
    },
    {
        name: 'CHECK Constraints on order_items',
        sql: `SELECT conname, pg_get_constraintdef(oid)
          FROM pg_constraint
          WHERE conrelid = 'order_items'::regclass AND contype = 'c'
          ORDER BY conname;`,
    },
    {
        name: 'TIMESTAMPTZ columns verification',
        sql: `SELECT table_name, column_name, data_type
          FROM information_schema.columns
          WHERE table_schema = 'public'
            AND table_name IN ('featured_list_items', 'featured_lists', 'otp_verifications')
            AND column_name IN ('created_at', 'updated_at', 'expires_at')
          ORDER BY table_name, column_name;`,
    },
];

async function runMigrations(client) {
    for (const file of MIGRATIONS) {
        const filePath = path.join(__dirname, '..', 'migrations', file);
        const sql = fs.readFileSync(filePath, 'utf-8');
        console.log(`▶ Running ${file}...`);
        try {
            await client.query(sql);
            console.log(`  ✅ ${file} — SUCCESS\n`);
        } catch (err) {
            console.error(`  ❌ ${file} — FAILED: ${err.message}\n`);
            // Continue with next migration instead of aborting
        }
    }
}

async function runVerifications(client) {
    for (const verification of VERIFICATIONS) {
        console.log(`📋 ${verification.name}:`);
        try {
            const result = await client.query(verification.sql);
            if (result.rows.length === 0) {
                console.log('   (no results — this is good for "Missing FK Indexes")\n');
            } else {
                console.table(result.rows);
                console.log();
            }
        } catch (err) {
            console.error(`   ⚠ Query failed: ${err.message}\n`);
        }
    }
}

async function run() {
    const client = await pool.connect();
    console.log('\n========================================');
    console.log('  DATABASE SCHEMA MIGRATION RUNNER');
    console.log('========================================\n');

    await runMigrations(client);

    // Run verifications
    console.log('\n========================================');
    console.log('  VERIFICATION QUERIES');
    console.log('========================================\n');

    await runVerifications(client);

    client.release();
    await pool.end();
    console.log('Done.');
}

run().catch((err) => {
    console.error('Fatal error:', err);
    pool.end();
    process.exit(1);
});
