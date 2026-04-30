// config/db.js
const { Pool } = require('pg');
require('dotenv').config();

// Check if DATABASE_URL is loaded
if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL environment variable is not set.");
}

const isLocalhost = process.env.DATABASE_URL.includes('localhost') || process.env.DATABASE_URL.includes('127.0.0.1');

function buildSslConfig() {
  if (isLocalhost) return false;

  const rejectUnauthorized = process.env.PG_SSL_REJECT_UNAUTHORIZED !== 'false';
  const ca = process.env.PG_SSL_CA;

  if (ca && ca.trim().length > 0) {
    return { ca, rejectUnauthorized };
  }

  return { rejectUnauthorized };
}

function handlePoolError(err) {
  console.error('[DB] Unexpected error on idle client:', err.message);
}

function handlePoolConnect(client) {
  client.query('SET session pg_trgm.similarity_threshold = 0.35;').catch((err) => {
    console.error('[DB] Failed to set similarity_threshold:', err.message);
  });
}

function handleStartupConnectionTest(err, res) {
  if (err) {
    console.error('[DB] Connection test failed:', err.message);
    return;
  }

  console.log('[DB] Connected successfully at:', res.rows[0].now);
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: buildSslConfig(),
  // Connection pool settings optimized for Supabase PgBouncer
  max: 10, // Maximum number of clients reduced to 10 for external pooler compatibility
  idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
  connectionTimeoutMillis: 5000 // Timeout for new connections
});

// Monitor pool errors
pool.on('error', handlePoolError);

// Configure pg_trgm similarity threshold explicitly for each new connection
pool.on('connect', handlePoolConnect);

// Test connection on startup
pool.query('SELECT NOW()', handleStartupConnectionTest);

// Enhanced query function with timing and error logging
async function query(text, params) {
  const start = Date.now();
  try {
    const result = await pool.query(text, params);
    const duration = Date.now() - start;

    // Log slow queries (> 500ms)
    if (duration > 500) {
      console.warn(`[DB] Slow query (${duration}ms):`, text.substring(0, 100));
    }

    return result;
  } catch (error) {
    const duration = Date.now() - start;
    console.error(`[DB] Query failed (${duration}ms):`, text.substring(0, 100), error.message);
    throw error;
  }
}

module.exports = {
  query,
  pool
};
