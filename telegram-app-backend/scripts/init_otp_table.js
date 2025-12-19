const db = require('../config/db');

const createOtpTable = async () => {
    try {
        const query = `
            CREATE TABLE IF NOT EXISTS otp_verifications (
                phone_number VARCHAR(20) PRIMARY KEY,
                code VARCHAR(6) NOT NULL,
                expires_at TIMESTAMP NOT NULL,
                attempts INTEGER DEFAULT 0,
                created_at TIMESTAMP DEFAULT NOW()
            );
        `;
        await db.query(query);
        console.log('OTP Verifications table created successfully');
        process.exit(0);
    } catch (error) {
        console.error('Error creating OTP Verifications table:', error);
        process.exit(1);
    }
};

createOtpTable();
