// routes/auth.js
const express = require('express');
const { body, validationResult } = require('express-validator');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../config/db');
const crypto = require('crypto');

// Supplier Login
router.post('/supplier/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }

        // Find supplier by email
        const supplierQuery = 'SELECT * FROM suppliers WHERE email = $1 AND is_active = true';
        const supplierResult = await db.query(supplierQuery, [email.toLowerCase()]);

        if (supplierResult.rows.length === 0) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const supplier = supplierResult.rows[0];

        // Check password
        const isValidPassword = await bcrypt.compare(password, supplier.password_hash);
        if (!isValidPassword) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Generate JWT token
        const token = jwt.sign(
            {
                supplierId: supplier.id,
                email: supplier.email,
                name: supplier.name,
                role: 'supplier'
            },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.json({
            token,
            supplier: {
                id: supplier.id,
                name: supplier.name,
                email: supplier.email,
                category: supplier.category,
                location: supplier.location
            }
        });

    } catch (error) {
        console.error('Supplier login error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Admin Login
router.post('/admin/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        console.log('Login attempt:', email);

        const adminQuery = 'SELECT * FROM admins WHERE email = $1';
        const adminResult = await db.query(adminQuery, [email.toLowerCase()]);
        console.log('Admin lookup result:', adminResult.rows);

        if (adminResult.rows.length === 0) {
            return res.status(401).json({ error: 'Invalid credentials (no admin found)' });
        }

        const admin = adminResult.rows[0];
        console.log('Checking password for:', admin.email);

        const isValidPassword = await bcrypt.compare(password, admin.password_hash);
        console.log('Password match:', isValidPassword);

        if (!isValidPassword) {
            return res.status(401).json({ error: 'Invalid credentials (bad password)' });
        }

        const token = jwt.sign(
            { adminId: admin.id, email: admin.email, name: admin.full_name, role: 'admin' },
            process.env.JWT_ADMIN_SECRET,
            { expiresIn: '7d' }
        );

        res.json({ token, admin: { id: admin.id, name: admin.full_name, email: admin.email, role: admin.role } });

    } catch (error) {
        console.error('Admin login error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});


// Delivery Agent Login
router.post('/delivery/login', async (req, res) => {
    try {
        const { phoneNumber, password } = req.body;

        if (!phoneNumber || !password) {
            return res.status(400).json({ error: 'Phone number and password are required' });
        }

        // Find delivery agent by phone
        const agentQuery = 'SELECT * FROM delivery_agents WHERE phone_number = $1 AND is_active = true';
        const agentResult = await db.query(agentQuery, [phoneNumber]);

        if (agentResult.rows.length === 0) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const agent = agentResult.rows[0];

        // Check password
        const isValidPassword = await bcrypt.compare(password, agent.password_hash);
        if (!isValidPassword) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Generate JWT token
        const token = jwt.sign(
            {
                deliveryAgentId: agent.id,
                supplierId: agent.supplier_id,
                name: agent.full_name,
                role: 'delivery_agent'
            },
            process.env.JWT_DELIVERY_SECRET,
            { expiresIn: '7d' }
        );

        res.json({
            token,
            agent: {
                id: agent.id,
                name: agent.full_name,
                phone: agent.phone_number,
                supplierId: agent.supplier_id
            }
        });

    } catch (error) {
        console.error('Delivery agent login error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Telegram verification for delivery agents
router.post('/delivery/verify-telegram', async (req, res) => {
    try {
        const { initData } = req.body;
        
        // For now, return a simple response
        // In production, you'd verify the Telegram initData
        res.json({ 
            message: 'Telegram verification not implemented yet',
            initData 
        });

    } catch (error) {
        console.error('Telegram verification error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});



// --- NEW: Telegram Native App Login Endpoint ---
router.post('/telegram-native', async (req, res) => {
    try {
        const { auth_data } = req.body; // auth_data is the object returned by Telegram Login Widget

        if (!auth_data || !auth_data.hash || !auth_data.id) {
            return res.status(400).json({ error: 'Invalid Telegram authentication data provided.' });
        }

        // --- Telegram Data Validation (HMAC-SHA256) ---
        // This logic is similar to your existing authMiddleware.js
        const dataCheckString = Object.keys(auth_data)
            .filter(key => key !== 'hash') // Exclude 'hash' itself
            .map(key => `${key}=${auth_data[key]}`)
            .sort()
            .join('\n');

        const secretKey = crypto.createHmac('sha256', 'WebAppData').update(BOT_TOKEN).digest();
        const calculatedHash = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex');

        if (calculatedHash !== auth_data.hash) {
            console.warn('Telegram auth failed: Hash mismatch for user ID', auth_data.id);
            return res.status(403).json({ error: 'Forbidden: Invalid Telegram authentication data (hash mismatch).' });
        }

        // --- User Lookup/Creation ---
        // Assuming a 'users' table for general customers/app users
        // This table should at least have: id (PK), telegram_id (UNIQUE), first_name, last_name, username, photo_url, created_at, updated_at, selected_city_id
        
        let user;
        const findUserQuery = 'SELECT * FROM users WHERE telegram_id = $1';
        const userResult = await db.query(findUserQuery, [auth_data.id]);

        if (userResult.rows.length > 0) {
            user = userResult.rows[0];
            // Optionally update user details (name, photo, etc.) from Telegram if they've changed
            const updateQuery = `
                UPDATE users
                SET 
                    first_name = $1, 
                    last_name = $2, 
                    username = $3, 
                    photo_url = $4,
                    updated_at = NOW()
                WHERE telegram_id = $5
                RETURNING *;
            `;
            const updatedUserResult = await db.query(updateQuery, [
                auth_data.first_name || null,
                auth_data.last_name || null,
                auth_data.username || null,
                auth_data.photo_url || null,
                auth_data.id
            ]);
            user = updatedUserResult.rows[0];
        } else {
            // Create new user
            const insertUserQuery = `
                INSERT INTO users (telegram_id, first_name, last_name, username, photo_url, created_at, updated_at)
                VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
                RETURNING *;
            `;
            const newUserResult = await db.query(insertUserQuery, [
                auth_data.id,
                auth_data.first_name || null,
                auth_data.last_name || null,
                auth_data.username || null,
                auth_data.photo_url || null
            ]);
            user = newUserResult.rows[0];
        }

        // Generate JWT token for the user
        // Use JWT_SECRET for general user tokens
        const token = jwt.sign(
            {
                userId: user.id, // Your internal user ID
                telegramId: user.telegram_id,
                role: 'customer' // Assign a role for general app users
            },
            process.env.JWT_SECRET, // Make sure JWT_SECRET is defined in your backend .env
            { expiresIn: '7d' } // Token valid for 7 days
        );

        res.json({
            token,
            telegramUser: { // Return basic Telegram user info for client convenience
                id: auth_data.id,
                first_name: auth_data.first_name,
                last_name: auth_data.last_name,
                username: auth_data.username,
                photo_url: auth_data.photo_url
            },
            userProfile: { // Return initial user profile details from your backend
                id: user.id,
                first_name: user.first_name,
                last_name: user.last_name,
                username: user.username,
                selected_city_id: user.selected_city_id // Include selected city if it exists
            }
        });

    } catch (error) {
        console.error('Telegram native login error:', error);
        res.status(500).json({ error: 'Internal server error during Telegram login.' });
    }
});
// --- END NEW: Telegram Native App Login Endpoint ---


module.exports = router;