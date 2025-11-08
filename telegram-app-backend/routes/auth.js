const express = require('express');
const { body, validationResult } = require('express-validator');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../config/db');
const crypto = require('crypto');

// Helper function to generate both access and refresh tokens
const generateTokens = (payload, role) => {
  const accessToken = jwt.sign(
    payload,
    process.env.JWT_SECRET || process.env[`JWT_${role}_SECRET`],
    { expiresIn: '15m' } // Short-lived access token
  );
  
  // Use different secrets for different roles where possible
  const refreshToken = jwt.sign(
    { ...payload, type: 'refresh' },
    process.env.JWT_REFRESH_SECRET || process.env[`JWT_${role}_REFRESH_SECRET`] || process.env.JWT_SECRET || process.env[`JWT_${role}_SECRET`],
    { expiresIn: '7d' } // Longer refresh token
  );
  
  return { accessToken, refreshToken };
};

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

        // Don't distinguish between user not found vs wrong password to prevent enumeration
        if (supplierResult.rows.length === 0) {
            // Still hash the password to prevent timing attacks
            await bcrypt.compare(password, '$2b$10$NQ4q9yO6jRZ5pZ4q9yO6jRZ5pZ4q9yO6jRZ5pZ4q9yO6jRZ5pZ4q9y'); // dummy hash
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const supplier = supplierResult.rows[0];

        // Check password
        const isValidPassword = await bcrypt.compare(password, supplier.password_hash);
        if (!isValidPassword) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Generate JWT tokens
        const { accessToken, refreshToken } = generateTokens(
            {
                supplierId: supplier.id,
                email: supplier.email,
                name: supplier.name,
                role: 'supplier'
            },
            'SUPPLIER'
        );

        res.json({
            accessToken,
            refreshToken,
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

        const adminQuery = 'SELECT * FROM admins WHERE email = $1';
        const adminResult = await db.query(adminQuery, [email.toLowerCase()]);

        if (adminResult.rows.length === 0) {
            // Still hash the password to prevent timing attacks
            await bcrypt.compare(password, '$2b$10$NQ4q9yO6jRZ5pZ4q9yO6jRZ5pZ4q9yO6jRZ5pZ4q9yO6jRZ5pZ4q9y'); // dummy hash
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const admin = adminResult.rows[0];

        const isValidPassword = await bcrypt.compare(password, admin.password_hash);
        if (!isValidPassword) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const { accessToken, refreshToken } = generateTokens(
            { adminId: admin.id, email: admin.email, name: admin.full_name, role: 'admin' },
            'ADMIN'
        );

        res.json({ 
            accessToken,
            refreshToken,
            admin: { id: admin.id, name: admin.full_name, email: admin.email, role: admin.role } 
        });

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
            // Still hash the password to prevent timing attacks
            await bcrypt.compare(password, '$2b$10$NQ4q9yO6jRZ5pZ4q9yO6jRZ5pZ4q9yO6jRZ5pZ4q9yO6jRZ5pZ4q9y'); // dummy hash
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const agent = agentResult.rows[0];

        // Check password
        const isValidPassword = await bcrypt.compare(password, agent.password_hash);
        if (!isValidPassword) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Generate JWT tokens
        const { accessToken, refreshToken } = generateTokens(
            {
                deliveryAgentId: agent.id,
                supplierId: agent.supplier_id,
                name: agent.full_name,
                role: 'delivery_agent'
            },
            'DELIVERY'
        );

        res.json({
            accessToken,
            refreshToken,
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

// Refresh token endpoint
router.post('/refresh', async (req, res) => {
    // Check for development bypass for refresh token endpoint as well
    const isDevRequest = req.header('X-Dev-Bypass-Auth');
    const isLocalhost = req.ip === '127.0.0.1' || req.ip === '::1' || req.ip.startsWith('::ffff:127.0.0.1');

    if (process.env.NODE_ENV === 'development' && isDevRequest && isLocalhost) {
        // Enhanced security: Check for a specific secret in the header
        if (isDevRequest === process.env.DEV_BYPASS_SECRET) {
            console.warn('⚠️  Bypassing token refresh for local development via X-Dev-Bypass-Auth header.');
            
            // Generate a mock access token for development
            const mockToken = jwt.sign(
                { 
                    userId: 1, 
                    telegramId: 123456789, 
                    role: 'customer',
                    type: 'access'
                },
                process.env.JWT_SECRET,
                { expiresIn: '15m' }
            );

            res.json({ accessToken: mockToken });
            return;
        }
    }
    
    const { refreshToken } = req.body;
    
    if (!refreshToken) {
        return res.status(401).json({ error: 'Refresh token required' });
    }

    try {
        // Verify the refresh token
        const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET);
        
        if (decoded.type !== 'refresh') {
            return res.status(403).json({ error: 'Invalid token type' });
        }

        // Generate new access token based on the decoded payload
        const payload = { ...decoded };
        delete payload.type;
        delete payload.iat;
        delete payload.exp;

        // Create a new access token with the same role
        const newAccessToken = jwt.sign(
            payload,
            process.env.JWT_SECRET || process.env[`JWT_${decoded.role.toUpperCase()}_SECRET`],
            { expiresIn: '15m' } // Short-lived access token
        );

        res.json({ accessToken: newAccessToken });
    } catch (error) {
        console.error('Refresh token error:', error);
        return res.status(403).json({ error: 'Invalid or expired refresh token' });
    }
});

// Helper to construct full name from Telegram auth data
const getFullNameFromAuthData = (authData) => {
    let fullName = authData.first_name || '';
    if (authData.last_name) {
        fullName += (fullName ? ' ' : '') + authData.last_name;
    }
    return fullName;
};


// --- Telegram Native App Login Endpoint ---
router.post('/telegram-native', async (req, res) => {
    try {
        // Check for development bypass first
        const isDevRequest = req.header('X-Dev-Bypass-Auth');
        const isLocalhost = req.ip === '127.0.0.1' || req.ip === '::1' || req.ip.startsWith('::ffff:127.0.0.1');

        if (process.env.NODE_ENV === 'development' && isDevRequest && isLocalhost) {
            // Enhanced security: Check for a specific secret in the header
            if (isDevRequest === process.env.DEV_BYPASS_SECRET) {
                console.warn('⚠️  Bypassing Telegram auth for local development via X-Dev-Bypass-Auth header.');
                
                // Mock user data for development
                const mockAuthData = {
                    id: 123456789,
                    first_name: 'Local',
                    last_name: 'Dev',
                    username: 'localdev',
                    photo_url: null
                };

                // In dev mode, use the mock user data from the request body or default
                const { auth_data: requestData } = req.body;
                const auth_data = requestData || mockAuthData; 

                // Construct the full name for the database
                const fullName = getFullNameFromAuthData(auth_data);

                // --- User Lookup/Creation ---
                // We use the existing 'user_profiles' table and 'user_id' column for Telegram ID storage.

                let user;
                const findUserQuery = 'SELECT * FROM user_profiles WHERE user_id = $1';
                const userResult = await db.query(findUserQuery, [auth_data.id]);

                if (userResult.rows.length > 0) {
                    user = userResult.rows[0];
                    
                    // ✅ FIXED: Only update the 'full_name' column which exists
                    const updateQuery = `
                        UPDATE user_profiles
                        SET
                            full_name = $1,
                            updated_at = NOW()
                        WHERE user_id = $2
                        RETURNING *;
                    `;
                    const updatedUserResult = await db.query(updateQuery, [
                        fullName,
                        auth_data.id
                    ]);
                    user = updatedUserResult.rows[0];
                } else {
                    // Create new user
                    // ✅ FIXED: Only insert into 'user_id' and 'full_name'
                    const insertUserQuery = `
                        INSERT INTO user_profiles (user_id, full_name, created_at, updated_at)
                        VALUES ($1, $2, NOW(), NOW())
                        RETURNING *;
                    `;
                    const newUserResult = await db.query(insertUserQuery, [
                        auth_data.id,
                        fullName,
                    ]);
                    user = newUserResult.rows[0];
                }

                // Generate JWT tokens for the user
                const { accessToken, refreshToken } = generateTokens(
                    {
                        userId: user.user_id, // Using Telegram ID as the primary unique user identifier in the token payload
                        telegramId: user.user_id,
                        role: 'customer' // Assign a role for general app users
                    },
                    'CUSTOMER'
                );

                res.json({
                    accessToken,
                    refreshToken,
                    telegramUser: { // Return basic Telegram user info for client convenience
                        id: auth_data.id,
                        first_name: auth_data.first_name,
                        last_name: auth_data.last_name,
                        username: auth_data.username,
                        photo_url: auth_data.photo_url
                    },
                    userProfile: { // Return initial user profile details from your backend
                        userId: user.user_id, // Use user_id (Telegram ID)
                        fullName: user.full_name, // Use fullName
                        selected_city_id: user.selected_city_id // Include selected city if it exists
                    }
                });
                return; // Exit early after handling dev mode
            }
        }
        
        // --- Regular production Telegram data validation ---
        const { auth_data } = req.body; // auth_data is the object returned by Telegram Login Widget

        if (!auth_data || !auth_data.hash || !auth_data.id) {
            return res.status(400).json({ error: 'Invalid Telegram authentication data provided.' });
        }

        // --- Telegram Data Validation (HMAC-SHA256) ---
        // BOT_TOKEN is missing. Assuming it's defined elsewhere or will be fixed by the user.
        // const secretKey = crypto.createHmac('sha256', 'WebAppData').update(BOT_TOKEN).digest();
        // Placeholder for BOT_TOKEN, assuming it's available via env variable
        const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN; 
        if (!BOT_TOKEN) {
             console.error('CRITICAL: TELEGRAM_BOT_TOKEN is missing from environment variables.');
             return res.status(500).json({ error: 'Server configuration error: Missing bot token.' });
        }

        // According to Telegram documentation for Web Apps, we need to:
        // 1. Get all received parameters
        // 2. Exclude 'hash' parameter
        // 3. Sort parameters alphabetically by parameter name
        // 4. Create a string by joining all parameter-value pairs in format: parameter=value
        // 5. For 'user' object, serialize it as JSON string in a specific format
        let dataCheckArray = [];
        
        // Get all parameter names except 'hash' and sort them alphabetically
        const paramNames = Object.keys(auth_data).filter(key => key !== 'hash').sort();
        
        for (const key of paramNames) {
            if (key === 'user' && typeof auth_data[key] === 'object') {
                // For the 'user' object, stringify it in a specific format required by Telegram
                // Must be a JSON string without any extra spaces
                const userString = JSON.stringify(auth_data[key]).replace(/\s/g, '');
                dataCheckArray.push(`${key}=${userString}`);
            } else {
                // For other parameters, just add them as key=value
                if (auth_data[key] !== undefined && auth_data[key] !== null) {
                    dataCheckArray.push(`${key}=${auth_data[key]}`);
                }
            }
        }
        
        const dataCheckString = dataCheckArray.join('\n');

        // According to Telegram Web App documentation, the secret key should be:
        // SHA256 of the string "WebAppData" concatenated with the bot token
        const secretKey = crypto
            .createHmac('sha256', 'WebAppData')
            .update(BOT_TOKEN)
            .digest();

        const calculatedHash = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex');

        // Check if this is development mode with mock hash
        const isDevMode = process.env.NODE_ENV === 'development';
        const isDevMockHash = auth_data.hash === 'mock_hash_for_dev_mode';
        
        // In development, allow mock hash or real hash
        if (isDevMode && isDevMockHash) {
            // Allow mock hash in development mode
            console.log('Allowing mock hash for development user ID', auth_data.id);
        } else if (calculatedHash !== auth_data.hash) {
            console.warn('Telegram auth failed: Hash mismatch for user ID', auth_data.id);
            console.warn('dataCheckString used for validation:', dataCheckString);
            console.warn('Expected hash:', auth_data.hash);
            console.warn('Calculated hash:', calculatedHash);
            console.warn('Full auth_data received:', auth_data);
            return res.status(403).json({ error: 'Forbidden: Invalid Telegram authentication data (hash mismatch).' });
        }
        
        // Construct the full name for the database
        const fullName = getFullNameFromAuthData(auth_data);

        // --- User Lookup/Creation ---
        
        let user;
        const findUserQuery = 'SELECT * FROM user_profiles WHERE user_id = $1';
        const userResult = await db.query(findUserQuery, [auth_data.id]);

        if (userResult.rows.length > 0) {
            user = userResult.rows[0];
            
            // ✅ FIXED: Only update the 'full_name' column which exists
            const updateQuery = `
                UPDATE user_profiles
                SET 
                    full_name = $1,
                    updated_at = NOW()
                WHERE user_id = $2
                RETURNING *;
            `;
            const updatedUserResult = await db.query(updateQuery, [
                fullName,
                auth_data.id
            ]);
            user = updatedUserResult.rows[0];
        } else {
            // Create new user
            // ✅ FIXED: Only insert into 'user_id' and 'full_name'
            const insertUserQuery = `
                INSERT INTO user_profiles (user_id, full_name, created_at, updated_at)
                VALUES ($1, $2, NOW(), NOW())
                RETURNING *;
            `;
            const newUserResult = await db.query(insertUserQuery, [
                auth_data.id,
                fullName,
            ]);
            user = newUserResult.rows[0];
        }

        // Generate JWT tokens for the user
        const { accessToken, refreshToken } = generateTokens(
            {
                userId: user.user_id, // Using Telegram ID as the primary unique user identifier in the token payload
                telegramId: user.user_id,
                role: 'customer' // Assign a role for general app users
            },
            'CUSTOMER'
        );

        res.json({
            accessToken,
            refreshToken,
            telegramUser: { // Return basic Telegram user info for client convenience
                id: auth_data.id,
                first_name: auth_data.first_name,
                last_name: auth_data.last_name,
                username: auth_data.username,
                photo_url: auth_data.photo_url
            },
            userProfile: { // Return initial user profile details from your backend
                userId: user.user_id, // Use user_id (Telegram ID)
                fullName: user.full_name, // Use fullName
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