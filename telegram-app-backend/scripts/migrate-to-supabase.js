// scripts/migrate-to-supabase.js
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// The connection string provided by the user (or from .env)
const CONNECTION_STRING = "postgresql://postgres.tyjlmyulscalobjtdyjh:gytkyc-4gyrqo-siXgot@aws-1-eu-central-1.pooler.supabase.com:6543/postgres";

const migrationsDir = path.join(__dirname, '../supabase/migrations');

async function runMigrations() {
  const client = new Client({
    connectionString: CONNECTION_STRING,
    ssl: {
      rejectUnauthorized: false
    }
  });

  try {
    await client.connect();
    console.log('Connected to Supabase successfully.');

    // Enable required extensions
    console.log('Enabling extensions...');
    await client.query('CREATE EXTENSION IF NOT EXISTS pg_trgm;');
    await client.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp";');
    console.log('Extensions enabled.');

    const files = fs.readdirSync(migrationsDir)
      .filter(f => f.endsWith('.sql'))
      .sort(); // Ensure they run in order

    for (const file of files) {
      console.log(`Running migration: ${file}`);
      const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
      
      try {
        await client.query(sql);
        console.log(`Successfully completed: ${file}`);
      } catch (err) {
        console.error(`Error in ${file}:`, err.message);
        // If it's a "table already exists" error, we might want to continue, but since we are "starting clean", it should be fine.
        throw err;
      }
    }

    console.log('All migrations executed successfully!');
  } catch (err) {
    console.error('Migration failed:', err.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

runMigrations();
