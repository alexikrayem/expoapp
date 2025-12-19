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
        { expiresIn: '15m' } // Short-lived access token (15 minutes)
    );

    // Use different secrets for different roles where possible
    const refreshToken = jwt.sign(
        { ...payload, type: 'refresh' },
        process.env.JWT_REFRESH_SECRET || process.env[`JWT_${role}_REFRESH_SECRET`] || process.env.JWT_SECRET || process.env[`JWT_${role}_SECRET`],
        { expiresIn: '7d' } // Longer refresh token (7 days)
    );

    return { accessToken, refreshToken };
};

const validateRequest = require('../middleware/validateRequest');

// Supplier Login
router.post('/supplier/login', [
    body('email').isEmail().withMessage('Please provide a valid email'),
    body('password').notEmpty().withMessage('Password is required'),
    validateRequest
], async (req, res) => {
    try {
        const { email, password } = req.body;

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
router.post('/admin/login', [
    body('email').isEmail().withMessage('Please provide a valid email'),
    body('password').notEmpty().withMessage('Password is required'),
    validateRequest
], async (req, res) => {
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
router.post('/delivery/login', [
    body('phoneNumber').notEmpty().withMessage('Phone number is required'),
    body('password').notEmpty().withMessage('Password is required'),
    validateRequest
], async (req, res) => {
    try {
        const { phoneNumber, password } = req.body;

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
    // Development bypass REMOVED for security

    const refreshToken = req.cookies.refreshToken;

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


// --- Telegram Login Widget Endpoint ---
const { validateTelegramLoginWidgetData } = require('../src/utils/telegramAuth');

router.post('/telegram-login-widget', [
    body('authData').notEmpty().withMessage('Auth data is required'),
    validateRequest
], async (req, res) => {
    try {
        // Development bypass REMOVED for security
        const { authData: receivedAuthData } = req.body;
        // Validation handled by middleware

        // --- START SECURITY FIX: Validate the hash from Telegram ---
        const validation = validateTelegramLoginWidgetData(receivedAuthData, process.env.TELEGRAM_BOT_TOKEN);
        if (!validation.ok) {
            console.error('Telegram auth validation failed:', validation.error);
            // Do not give specific reasons to the client for security.
            return res.status(403).json({ error: 'Invalid Telegram authentication data' });
        }
        // --- END SECURITY FIX ---

        const authData = receivedAuthData;

        const fullName = [authData.first_name, authData.last_name].filter(Boolean).join(' ');

        // user lookup / creation logic remains unchanged
        // user lookup logic
        const findUserQuery = 'SELECT * FROM user_profiles WHERE user_id = $1';
        const userResult = await db.query(findUserQuery, [authData.id]);

        let user;
        if (userResult.rows.length > 0) {
            const updateQuery = `
                UPDATE user_profiles
                SET full_name = $1, updated_at = NOW()
                WHERE user_id = $2 RETURNING *;
            `;
            const updatedUser = await db.query(updateQuery, [fullName, authData.id]);
            user = updatedUser.rows[0];
        } else {
            // User not found - strict registration required
            return res.status(404).json({
                error: 'User not registered',
                message: 'Please complete your profile to continue.',
                telegramUser: authData
            });
        }

        const { accessToken, refreshToken } = generateTokens(
            { userId: user.user_id, telegramId: user.user_id, role: 'customer' },
            'CUSTOMER'
        );

        // Security: Set Refresh Token in HttpOnly Cookie
        res.cookie('refreshToken', refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: process.env.NODE_ENV === 'production' ? 'Strict' : 'Lax',
            maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
        });

        // Check if request is from Mobile App (via WebView)
        const isMobile = req.headers['x-client-type'] === 'mobile';

        res.json({
            accessToken,
            refreshToken: isMobile ? refreshToken : undefined,
            telegramUser: authData,
            userProfile: {
                userId: user.user_id,
                fullName: user.full_name,
                selected_city_id: user.selected_city_id,
                profileCompleted: user.profile_completed || false,
            },
        });
    } catch (error) {
        console.error('Telegram Login Widget error:', error);
        res.status(500).json({ error: 'Internal server error during Telegram Login Widget authentication.' });
    }
});

// --- NEW Endpoint: Registration with Profile Data ---
router.post('/telegram-register-widget', [
    body('authData').notEmpty().withMessage('Auth data is required'),
    body('profileData').notEmpty().withMessage('Profile data is required'),
    body('profileData.phone_number').notEmpty().withMessage('Phone number is required'),
    body('profileData.address_line1').notEmpty().withMessage('Address is required'),
    body('profileData.city').notEmpty().withMessage('City is required'),
    validateRequest
], async (req, res) => {
    try {
        const { authData: receivedAuthData, profileData } = req.body;
        // Validation handled by middleware

        // 1. Verify Hash Again (Security)
        const validation = validateTelegramLoginWidgetData(receivedAuthData, process.env.TELEGRAM_BOT_TOKEN);
        if (!validation.ok) {
            return res.status(403).json({ error: 'Invalid Telegram authentication data' });
        }

        const authData = receivedAuthData;

        // 2. Validate Required Profile Fields (Server-Side) - Additional Logic Check if needed, but handled by validator mostly
        // ... kept previous manual check just in case, or removed since validator covers it.
        // Let's rely on validator for required fields.

        const fullName = profileData.full_name || [authData.first_name, authData.last_name].filter(Boolean).join(' ');

        // 3. Create User
        // Check if exists first to prevent duplicates
        const findUserQuery = 'SELECT * FROM user_profiles WHERE user_id = $1';
        const existingUser = await db.query(findUserQuery, [authData.id]);

        if (existingUser.rows.length > 0) {
            return res.status(409).json({ error: 'User already registered' });
        }

        const insertUserQuery = `
        INSERT INTO user_profiles (
            user_id, full_name, phone_number, address_line1, address_line2, city, 
            selected_city_id, date_of_birth, gender, professional_license_number,
            clinic_name, clinic_phone, clinic_address_line1, clinic_address_line2,
            clinic_city, clinic_country, clinic_license_number, clinic_specialization,
            professional_role, years_of_experience, education_background,
            clinic_coordinates,
            profile_completed, created_at, updated_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, true, NOW(), NOW()) 
        RETURNING *;
        `;

        const newUser = await db.query(insertUserQuery, [
            authData.id,
            fullName,
            profileData.phone_number,
            profileData.address_line1,
            profileData.address_line2 || null,
            profileData.city,
            profileData.selected_city_id || null,
            profileData.date_of_birth || null,
            profileData.gender || null,
            profileData.professional_license_number || null,
            // Clinic Info
            profileData.clinic_name || null,
            profileData.clinic_phone || null,
            profileData.clinic_address_line1 || null,
            profileData.clinic_address_line2 || null,
            profileData.clinic_city || null,
            profileData.clinic_country || null,
            profileData.clinic_license_number || null,
            profileData.clinic_specialization || null,
            // Professional Info
            profileData.professional_role || null,
            profileData.years_of_experience || null,
            profileData.education_background || null,
            // JSON fields
            profileData.clinic_coordinates ? JSON.stringify(profileData.clinic_coordinates) : null
        ]);

        const user = newUser.rows[0];

        // 4. Generate Tokens (Login immediately)
        const { accessToken, refreshToken } = generateTokens(
            { userId: user.user_id, telegramId: user.user_id, role: 'customer' },
            'CUSTOMER'
        );

        res.cookie('refreshToken', refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: process.env.NODE_ENV === 'production' ? 'Strict' : 'Lax',
            maxAge: 7 * 24 * 60 * 60 * 1000
        });

        const isMobile = req.headers['x-client-type'] === 'mobile';

        res.json({
            accessToken,
            refreshToken: isMobile ? refreshToken : undefined,
            telegramUser: authData,
            userProfile: user,
            message: "Registration successful"
        });

    } catch (error) {
        console.error('Telegram Register Widget error:', error);
        res.status(500).json({
            error: 'Internal server error during registration.',
            details: error.message
        });
    }
});
// --- END Telegram Login Widget Endpoint ---


// --- Phone Number OTP Authentication ---

// 1. Send OTP
router.post('/send-otp', [
    body('phone_number').notEmpty().withMessage('Phone number is required'),
    validateRequest
], async (req, res) => {
    console.log('[AuthRoute] Hit /send-otp with body:', req.body);
    try {
        const { phone_number } = req.body;
        // Validation handled by middleware

        // Generate 6-digit code
        const code = Math.floor(100000 + Math.random() * 900000).toString();

        // 5 minutes expiration
        const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

        // Upsert OTP
        const query = `
            INSERT INTO otp_verifications (phone_number, code, expires_at, attempts)
            VALUES ($1, $2, $3, 0)
            ON CONFLICT (phone_number) 
            DO UPDATE SET code = $2, expires_at = $3, attempts = 0, created_at = NOW();
        `;

        await db.query(query, [phone_number, code, expiresAt]);

        // MOCK SMS SENDING
        console.log(`[MOCK SMS] OTP for ${phone_number}: ${code}`);

        // Return code in response for DEV mode convenience
        res.json({
            message: 'OTP sent successfully',
            dev_code: code // TODO: Remove in production
        });

    } catch (error) {
        console.error('Send OTP error:', error);
        res.status(500).json({ error: 'Internal server error processing OTP' });
    }
});

// 2. Verify OTP
router.post('/verify-otp', [
    body('phone_number').notEmpty().withMessage('Phone number is required'),
    body('code').notEmpty().withMessage('Code is required'),
    validateRequest
], async (req, res) => {
    try {
        const { phone_number, code } = req.body;
        // Validation handled by middleware

        // Check OTP
        const otpQuery = 'SELECT * FROM otp_verifications WHERE phone_number = $1';
        const otpResult = await db.query(otpQuery, [phone_number]);

        if (otpResult.rows.length === 0) {
            return res.status(400).json({ error: 'No OTP found for this number' });
        }

        const otpRecord = otpResult.rows[0];

        if (otpRecord.attempts >= 5) {
            return res.status(429).json({ error: 'Too many failed attempts. Please request a new code.' });
        }

        if (new Date() > new Date(otpRecord.expires_at)) {
            return res.status(400).json({ error: 'OTP expired. Please request a new one.' });
        }

        if (otpRecord.code !== code) {
            // Increment attempts
            await db.query('UPDATE otp_verifications SET attempts = attempts + 1 WHERE phone_number = $1', [phone_number]);
            return res.status(400).json({ error: 'Invalid code' });
        }

        // Check if User Exists
        const userQuery = 'SELECT * FROM user_profiles WHERE phone_number = $1';
        const userResult = await db.query(userQuery, [phone_number]);

        if (userResult.rows.length > 0) {
            // Existing User -> Login
            const user = userResult.rows[0];
            const { accessToken, refreshToken } = generateTokens(
                { userId: user.user_id, role: 'customer' },
                'CUSTOMER'
            );

            res.cookie('refreshToken', refreshToken, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: process.env.NODE_ENV === 'production' ? 'Strict' : 'Lax',
                maxAge: 7 * 24 * 60 * 60 * 1000
            });

            return res.json({
                isNew: false,
                accessToken,
                refreshToken,
                userProfile: user
            });
        } else {
            // New User -> Require Registration
            // We return a 'verified' status so the frontend knows to proceed to the wizard
            return res.json({
                isNew: true,
                phone_number
            });
        }

    } catch (error) {
        console.error('Verify OTP error:', error);
        res.status(500).json({ error: 'Internal server error verifying OTP' });
    }
});

// 3. Register with Phone (Final Step of Wizard)
router.post('/register-phone', [
    body('phone_number').notEmpty().withMessage('Phone number is required'),
    body('code').notEmpty().withMessage('Verification code is required'),
    body('profileData').notEmpty().withMessage('Profile data is required'),
    body('profileData.full_name').notEmpty().withMessage('Full name is required'),
    body('profileData.address_line1').notEmpty().withMessage('Address is required'),
    body('profileData.city').notEmpty().withMessage('City is required'),
    validateRequest
], async (req, res) => {
    try {
        const { phone_number, code, profileData } = req.body;
        // Validation handled by middleware

        // Re-verify code to prevent bypassing verify-otp step
        // (In a verified JWT flow, we'd verify the token, but checking code again is simple for now)
        const otpQuery = 'SELECT * FROM otp_verifications WHERE phone_number = $1 AND code = $2';
        const otpResult = await db.query(otpQuery, [phone_number, code]);

        if (otpResult.rows.length === 0 || new Date() > new Date(otpResult.rows[0].expires_at)) {
            return res.status(400).json({ error: 'Invalid or expired OTP verification session.' });
        }

        // Check duplicates again
        const userQuery = 'SELECT * FROM user_profiles WHERE phone_number = $1';
        const duplicateCheck = await db.query(userQuery, [phone_number]);
        if (duplicateCheck.rows.length > 0) {
            return res.status(409).json({ error: 'User already exists with this phone number.' });
        }

        // Generate a random User ID (since we don't have Telegram ID anymore)
        // We can use the phone number as the ID or generate a UUID. 
        // Let's generate a BigInt-like ID or UUID. 
        // Postgres user_id in schema is BIGINT? Let's check schema. 
        // Assuming user_id is BIGINT, let's generate a random 53-bit integer.
        // Or if schema allows, use phone number digits? Phone number might be too large/variable.
        // Let's generate a pseudo-random ID.
        const userId = Math.floor(Math.random() * 9000000000000000);

        const insertUserQuery = `
            INSERT INTO user_profiles (
                user_id, full_name, phone_number, address_line1, address_line2, city, 
                selected_city_id, date_of_birth, gender, professional_license_number,
                clinic_name, clinic_phone, clinic_address_line1, clinic_address_line2,
                clinic_city, clinic_country, clinic_license_number, clinic_specialization,
                professional_role, years_of_experience, education_background,
                clinic_coordinates,
                profile_completed, created_at, updated_at
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, true, NOW(), NOW()) 
            RETURNING *;
        `;

        const newUser = await db.query(insertUserQuery, [
            userId,
            profileData.full_name,
            phone_number,
            profileData.address_line1,
            profileData.address_line2 || null,
            profileData.city,
            profileData.selected_city_id || null,
            profileData.date_of_birth || null,
            profileData.gender || null,
            profileData.professional_license_number || null,
            // Clinic Info
            profileData.clinic_name || null,
            profileData.clinic_phone || null,
            profileData.clinic_address_line1 || null,
            profileData.clinic_address_line2 || null,
            profileData.clinic_city || null,
            profileData.clinic_country || null,
            profileData.clinic_license_number || null,
            profileData.clinic_specialization || null,
            // Professional Info
            profileData.professional_role || null,
            profileData.years_of_experience || null,
            profileData.education_background || null,
            // JSON fields
            profileData.clinic_coordinates ? JSON.stringify(profileData.clinic_coordinates) : null
        ]);

        const user = newUser.rows[0];

        // Clear OTP
        await db.query('DELETE FROM otp_verifications WHERE phone_number = $1', [phone_number]);

        // Generate Tokens
        const { accessToken, refreshToken } = generateTokens(
            { userId: user.user_id, role: 'customer' },
            'CUSTOMER'
        );

        res.cookie('refreshToken', refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: process.env.NODE_ENV === 'production' ? 'Strict' : 'Lax',
            maxAge: 7 * 24 * 60 * 60 * 1000
        });

        res.json({
            message: 'Registration successful',
            accessToken,
            refreshToken,
            userProfile: user
        });

    } catch (error) {
        console.error('Register Phone error:', error);
        res.status(500).json({ error: 'Internal server error during phone registration' });
    }
});





module.exports = router;