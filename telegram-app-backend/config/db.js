// config/db.js
const { Pool } = require('pg');
require('dotenv').config();

// Check if DATABASE_URL is loaded
if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL environment variable is not set.");
}

const isLocalhost = process.env.DATABASE_URL.includes('localhost') || process.env.DATABASE_URL.includes('127.0.0.1');

const buildSslConfig = () => {
  if (isLocalhost) return false;

  const rejectUnauthorized = process.env.PG_SSL_REJECT_UNAUTHORIZED !== 'false';
  const ca = process.env.PG_SSL_CA;

  if (ca && ca.trim().length > 0) {
    return { ca, rejectUnauthorized };
  }

  return { rejectUnauthorized };
};

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: buildSslConfig(),
  // Connection pool settings for production
  max: 20, // Maximum number of clients
  idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
  connectionTimeoutMillis: 5000 // Timeout for new connections
});

// Monitor pool errors
pool.on('error', (err, client) => {
  console.error('[DB] Unexpected error on idle client:', err.message);
});

// Test connection on startup
pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('[DB] Connection test failed:', err.message);
  } else {
    console.log('[DB] Connected successfully at:', res.rows[0].now);
  }
});

// Enhanced query function with timing and error logging
const query = async (text, params) => {
  const start = Date.now();
  try {
    const result = await pool.query(text, params);
    const duration = Date.now() - start;

    // Log slow queries (> 1 second)
    if (duration > 1000) {
      console.warn(`[DB] Slow query (${duration}ms):`, text.substring(0, 100));
    }

    return result;
  } catch (error) {
    const duration = Date.now() - start;
    console.error(`[DB] Query failed (${duration}ms):`, text.substring(0, 100), error.message);
    throw error;
  }
};

module.exports = {
  query,
  pool
};
