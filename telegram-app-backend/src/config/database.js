// telegram-app-backend/src/config/database.js - Improved database configuration
const { Pool } = require('pg');
require('dotenv').config();

class Database {
    constructor() {
        if (!process.env.DATABASE_URL) {
            throw new Error("DATABASE_URL environment variable is not set.");
        }

        this.pool = new Pool({
            connectionString: process.env.DATABASE_URL,
            ssl: process.env.NODE_ENV === 'production' ? {
                rejectUnauthorized: false
            } : false,
            max: 20, // Maximum number of clients in the pool
            idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
            connectionTimeoutMillis: 2000, // Return an error after 2 seconds if connection could not be established
        });

        this.pool.on('error', (err) => {
            console.error('Unexpected error on idle client', err);
        });

        // Test connection on startup
        this.testConnection();
    }

    async testConnection() {
        try {
            const client = await this.pool.connect();
            const result = await client.query('SELECT NOW()');
            console.log('✅ Database connected successfully at:', result.rows[0].now);
            client.release();
        } catch (err) {
            console.error('❌ Error connecting to database:', err);
            throw err;
        }
    }

    async query(text, params) {
        const start = Date.now();
        try {
            const result = await this.pool.query(text, params);
            const duration = Date.now() - start;
            
            if (process.env.NODE_ENV === 'development') {
                console.log('Executed query', { text, duration, rows: result.rowCount });
            }
            
            return result;
        } catch (error) {
            console.error('Database query error:', { text, error: error.message });
            throw error;
        }
    }

    async getClient() {
        return await this.pool.connect();
    }

    async close() {
        await this.pool.end();
        console.log('Database pool closed');
    }
}

// Create singleton instance
const database = new Database();

module.exports = {
    query: (text, params) => database.query(text, params),
    getClient: () => database.getClient(),
    close: () => database.close(),
    pool: database.pool
};