const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const bcrypt = require('bcrypt');
const db = require('../config/db');
const crypto = require('crypto');
const { issueTokens, rotateRefreshToken, revokeRefreshToken } = require('../services/tokenService');


const validateRequest = require('../middleware/validateRequest');

const buildCookieOptions = () => ({
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'Strict' : 'Lax',
    maxAge: 7 * 24 * 60 * 60 * 1000
});

const setRefreshCookie = (res, refreshToken) => {
    res.cookie('refreshToken', refreshToken, buildCookieOptions());
};

const clearRefreshCookie = (res) => {
    res.clearCookie('refreshToken', buildCookieOptions());
};

const getRefreshTokenFromRequest = (req) => {
    const authHeader = req.headers.authorization;
    const headerToken = authHeader && authHeader.startsWith('Bearer ')
        ? authHeader.split(' ')[1]
        : null;
    return req.cookies?.refreshToken || headerToken || req.body?.refreshToken || null;
};

const generateSecureUserId = async () => {
    // 48-bit ID: safe integer in JS, large enough to avoid collisions
    for (let attempt = 0; attempt < 5; attempt++) {
        const candidate = crypto.randomBytes(6).readUIntBE(0, 6);
        const exists = await db.query('SELECT 1 FROM user_profiles WHERE user_id = $1', [candidate]);
        if (exists.rows.length === 0) {
            return candidate;
        }
    }
    throw new Error('Failed to generate unique user ID');
};

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

        // Generate JWT tokens (with refresh rotation)
        const { accessToken, refreshToken } = await issueTokens({
            payload: {
                supplierId: supplier.id,
                email: supplier.email,
                name: supplier.name,
                role: 'supplier'
            },
            role: 'SUPPLIER',
            ip: req.ip,
            userAgent: req.get('user-agent')
        });

        setRefreshCookie(res, refreshToken);

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

        const { accessToken, refreshToken } = await issueTokens({
            payload: { adminId: admin.id, email: admin.email, name: admin.full_name, role: 'admin' },
            role: 'ADMIN',
            ip: req.ip,
            userAgent: req.get('user-agent')
        });

        setRefreshCookie(res, refreshToken);

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
        const { accessToken, refreshToken } = await issueTokens({
            payload: {
                deliveryAgentId: agent.id,
                supplierId: agent.supplier_id,
                name: agent.full_name,
                role: 'delivery_agent'
            },
            role: 'DELIVERY',
            ip: req.ip,
            userAgent: req.get('user-agent')
        });

        setRefreshCookie(res, refreshToken);

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

// Refresh token endpoint
router.post('/refresh', async (req, res) => {
    const refreshToken = getRefreshTokenFromRequest(req);

    if (!refreshToken) {
        return res.status(401).json({ error: 'Refresh token required' });
    }

    try {
        const { accessToken, refreshToken: newRefreshToken } = await rotateRefreshToken({
            token: refreshToken,
            ip: req.ip,
            userAgent: req.get('user-agent')
        });

        setRefreshCookie(res, newRefreshToken);
        res.json({ accessToken, refreshToken: newRefreshToken });
    } catch (error) {
        console.error('Refresh token error:', error);
        return res.status(403).json({ error: error.message || 'Invalid or expired refresh token' });
    }
});

// Logout (revoke refresh token)
router.post('/logout', async (req, res) => {
    try {
        const refreshToken = getRefreshTokenFromRequest(req);
        if (refreshToken) {
            await revokeRefreshToken(refreshToken);
        }
        clearRefreshCookie(res);
        res.json({ message: 'Logged out' });
    } catch (error) {
        console.error('Logout error:', error);
        clearRefreshCookie(res);
        res.status(500).json({ error: 'Failed to logout' });
    }
});

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

        // Generate 6-digit code (CSPRNG)
        const code = crypto.randomInt(100000, 1000000).toString();

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

        // DEV-only OTP exposure for local testing (explicitly enabled)
        const exposeOtp = process.env.NODE_ENV !== 'production' && process.env.EXPOSE_OTP === 'true';
        if (exposeOtp) {
            console.log(`[DEV OTP] OTP for ${phone_number}: ${code}`);
        }

        const response = { message: 'OTP sent successfully' };
        if (exposeOtp) {
            response.dev_code = code;
        }
        res.json(response);

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

        let otpRecord = null;
        let isDevBypass = false;

        // DEV BYPASS: Allow '123456' in development
        if (process.env.NODE_ENV !== 'production' && code === '123456') {
            console.log(`[DEV BYPASS] Allowing 123456 for ${phone_number}`);
            isDevBypass = true;
        }

        if (!isDevBypass) {
            // Check OTP
            const otpQuery = 'SELECT * FROM otp_verifications WHERE phone_number = $1';
            const otpResult = await db.query(otpQuery, [phone_number]);

            if (otpResult.rows.length === 0) {
                return res.status(400).json({ error: 'No OTP found for this number' });
            }

            otpRecord = otpResult.rows[0];

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
        }

        // Check if User Exists
        const userQuery = 'SELECT * FROM user_profiles WHERE phone_number = $1';
        const userResult = await db.query(userQuery, [phone_number]);

        if (userResult.rows.length > 0) {
            // Existing User -> Login
            const user = userResult.rows[0];
            const { accessToken, refreshToken } = await issueTokens({
                payload: { userId: user.user_id, role: 'customer' },
                role: 'CUSTOMER',
                ip: req.ip,
                userAgent: req.get('user-agent')
            });

            setRefreshCookie(res, refreshToken);

            // Invalidate OTP on successful login to prevent replay
            await db.query('DELETE FROM otp_verifications WHERE phone_number = $1', [phone_number]);

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
        let isDevBypass = false;
        if (process.env.NODE_ENV !== 'production' && code === '123456') {
            isDevBypass = true;
        }

        if (!isDevBypass) {
            const otpQuery = 'SELECT * FROM otp_verifications WHERE phone_number = $1 AND code = $2';
            const otpResult = await db.query(otpQuery, [phone_number, code]);

            if (otpResult.rows.length === 0 || new Date() > new Date(otpResult.rows[0].expires_at)) {
                return res.status(400).json({ error: 'Invalid or expired OTP verification session.' });
            }
        }

        // Check duplicates again
        const userQuery = 'SELECT * FROM user_profiles WHERE phone_number = $1';
        const duplicateCheck = await db.query(userQuery, [phone_number]);
        if (duplicateCheck.rows.length > 0) {
            return res.status(409).json({ error: 'User already exists with this phone number.' });
        }

        // Generate a secure, unique user ID (since we don't have Telegram ID anymore)
        const userId = await generateSecureUserId();

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
        const { accessToken, refreshToken } = await issueTokens({
            payload: { userId: user.user_id, role: 'customer' },
            role: 'CUSTOMER',
            ip: req.ip,
            userAgent: req.get('user-agent')
        });

        setRefreshCookie(res, refreshToken);

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
