const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const crypto = require('crypto');
const db = require('../../config/db');
const logger = require('../../services/logger');
const { issueTokens } = require('../../services/tokenService');
const validateRequest = require('../../middleware/validateRequest');
const { normalizePhoneNumber } = require('../../utils/phoneNumber');
const {
    HTTP,
    NUMERIC_LIMITS,
    OTP_EXPIRY_MS,
    defaultPhoneCountryCode,
    otpSendLimiter,
    otpVerifyLimiter,
    hashOtpCode,
    safeStringEqual,
    isLegacyOtpCode,
    generateSecureUserId,
    setAuthCookies,
    withOptionalRefreshToken
} = require('./authUtils');

// --- Phone Number OTP Authentication ---

// 1. Send OTP
router.post('/send-otp', otpSendLimiter, [
    body('phone_number').notEmpty().withMessage('Phone number is required'),
    validateRequest
], async (req, res) => {
    try {
        const { phone_number } = req.body;
        const normalizedPhoneNumber = normalizePhoneNumber(phone_number, defaultPhoneCountryCode);
        if (!normalizedPhoneNumber) {
            return res.status(HTTP.BAD_REQUEST).json({ error: 'Invalid phone number format' });
        }

        // Generate 6-digit code (CSPRNG)
        const code = crypto.randomInt(NUMERIC_LIMITS.OTP_MIN_CODE, NUMERIC_LIMITS.OTP_MAX_CODE).toString();
        const codeHash = hashOtpCode(normalizedPhoneNumber, code);

        // expiration
        const expiresAt = new Date(Date.now() + OTP_EXPIRY_MS);

        // Upsert OTP
        const query = `
            INSERT INTO otp_verifications (phone_number, code, expires_at, attempts)
            VALUES ($1, $2, $3, 0)
            ON CONFLICT (phone_number) 
            DO UPDATE SET code = $2, expires_at = $3, attempts = 0, created_at = NOW();
        `;

        await db.query(query, [normalizedPhoneNumber, codeHash, expiresAt]);

        // DEV-only OTP exposure for local testing (explicitly enabled)
        const exposeOtp = process.env.NODE_ENV !== 'production' && process.env.EXPOSE_OTP === 'true';
        if (exposeOtp) {
            logger.info(`DEV OTP generated for ${normalizedPhoneNumber}`, { otp: code });
        }

        const response = { message: 'OTP sent successfully' };
        if (exposeOtp) {
            response.dev_code = code;
        }
        res.json(response);

    } catch (error) {
        logger.error('Send OTP error', error);
        res.status(HTTP.INTERNAL_SERVER_ERROR).json({ error: 'Internal server error processing OTP' });
    }
});

// 2. Verify OTP
router.post('/verify-otp', otpVerifyLimiter, [
    body('phone_number').notEmpty().withMessage('Phone number is required'),
    body('code').notEmpty().withMessage('Code is required'),
    validateRequest
], async (req, res) => {
    try {
        const { phone_number, code } = req.body;
        const normalizedPhoneNumber = normalizePhoneNumber(phone_number, defaultPhoneCountryCode);
        if (!normalizedPhoneNumber) {
            return res.status(HTTP.BAD_REQUEST).json({ error: 'Invalid phone number format' });
        }
        const submittedCode = String(code || '').trim();

        // Check OTP
        const otpQuery = 'SELECT code, expires_at, attempts FROM otp_verifications WHERE phone_number = $1';
        const otpResult = await db.query(otpQuery, [normalizedPhoneNumber]);

        if (otpResult.rows.length === 0) {
            return res.status(HTTP.BAD_REQUEST).json({ error: 'No OTP found for this number' });
        }

        const otpRecord = otpResult.rows[0];

        if (otpRecord.attempts >= 5) {
            return res.status(HTTP.TOO_MANY_REQUESTS).json({ error: 'Too many failed attempts. Please request a new code.' });
        }

        if (new Date() > new Date(otpRecord.expires_at)) {
            return res.status(HTTP.BAD_REQUEST).json({ error: 'OTP expired. Please request a new one.' });
        }

        const storedCode = String(otpRecord.code || '');
        const expectedCode = isLegacyOtpCode(storedCode)
            ? submittedCode
            : hashOtpCode(normalizedPhoneNumber, submittedCode);

        if (!safeStringEqual(storedCode, expectedCode)) {
            // Increment attempts
            await db.query(
                'UPDATE otp_verifications SET attempts = attempts + $2 WHERE phone_number = $1',
                [normalizedPhoneNumber, 1]
            );
            return res.status(HTTP.BAD_REQUEST).json({ error: 'Invalid code' });
        }

        // Check if User Exists
        const userQuery = 'SELECT * FROM user_profiles WHERE phone_number = $1';
        const userResult = await db.query(userQuery, [normalizedPhoneNumber]);

        if (userResult.rows.length > 0) {
            // Existing User -> Login
            const user = userResult.rows[0];
            const { accessToken, refreshToken } = await issueTokens({
                payload: { userId: user.user_id, role: 'customer' },
                role: 'CUSTOMER',
                ip: req.ip,
                userAgent: req.get('user-agent')
            });

            setAuthCookies(res, refreshToken);

            // Invalidate OTP on successful login to prevent replay
            await db.query('DELETE FROM otp_verifications WHERE phone_number = $1', [normalizedPhoneNumber]);

            return res.json(withOptionalRefreshToken({
                isNew: false,
                accessToken,
                userProfile: user
            }, refreshToken));
        } else {
            // New User -> Require Registration
            // We return a 'verified' status so the frontend knows to proceed to the wizard
            return res.json({
                isNew: true,
                phone_number: normalizedPhoneNumber
            });
        }

    } catch (error) {
        logger.error('Verify OTP error', error);
        res.status(HTTP.INTERNAL_SERVER_ERROR).json({ error: 'Internal server error verifying OTP' });
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
        const normalizedPhoneNumber = normalizePhoneNumber(phone_number, defaultPhoneCountryCode);
        if (!normalizedPhoneNumber) {
            return res.status(HTTP.BAD_REQUEST).json({ error: 'Invalid phone number format' });
        }
        const submittedCode = String(code || '').trim();

        // Re-verify code to prevent bypassing verify-otp step.
        const otpQuery = 'SELECT code, expires_at FROM otp_verifications WHERE phone_number = $1';
        const otpResult = await db.query(otpQuery, [normalizedPhoneNumber]);

        if (otpResult.rows.length === 0 || new Date() > new Date(otpResult.rows[0].expires_at)) {
            return res.status(HTTP.BAD_REQUEST).json({ error: 'Invalid or expired OTP verification session.' });
        }

        const storedCode = String(otpResult.rows[0].code || '');
        const expectedCode = isLegacyOtpCode(storedCode)
            ? submittedCode
            : hashOtpCode(normalizedPhoneNumber, submittedCode);

        if (!safeStringEqual(storedCode, expectedCode)) {
            return res.status(HTTP.BAD_REQUEST).json({ error: 'Invalid or expired OTP verification session.' });
        }

        // Check duplicates again
        const userQuery = 'SELECT 1 FROM user_profiles WHERE phone_number = $1';
        const duplicateCheck = await db.query(userQuery, [normalizedPhoneNumber]);
        if (duplicateCheck.rows.length > 0) {
            return res.status(HTTP.CONFLICT).json({ error: 'User already exists with this phone number.' });
        }

        // Generate a secure, unique user ID
        const userId = await generateSecureUserId();

        let newUser;
        const client = await db.pool.connect();

        try {
            await client.query('BEGIN');

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

            newUser = await client.query(insertUserQuery, [
                userId,
                profileData.full_name,
                normalizedPhoneNumber,
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

            // Clear OTP
            await client.query('DELETE FROM otp_verifications WHERE phone_number = $1', [normalizedPhoneNumber]);

            await client.query('COMMIT');

        } catch (insertError) {
            await client.query('ROLLBACK');
            const uniqueViolation = insertError && insertError.code === '23505';
            const phoneConstraintHit =
                /phone/i.test(insertError.constraint || '') ||
                /phone/i.test(insertError.detail || '');

            if (uniqueViolation && phoneConstraintHit) {
                return res.status(HTTP.CONFLICT).json({ error: 'User already exists with this phone number.' });
            }
            throw insertError;
        } finally {
            client.release();
        }

        const user = newUser.rows[0];

        // Generate Tokens
        const { accessToken, refreshToken } = await issueTokens({
            payload: { userId: user.user_id, role: 'customer' },
            role: 'CUSTOMER',
            ip: req.ip,
            userAgent: req.get('user-agent')
        });

        setAuthCookies(res, refreshToken);

        res.json(withOptionalRefreshToken({
            message: 'Registration successful',
            accessToken,
            userProfile: user
        }, refreshToken));

    } catch (error) {
        logger.error('Register Phone error', error);
        res.status(HTTP.INTERNAL_SERVER_ERROR).json({ error: 'Internal server error during phone registration' });
    }
});

module.exports = router;
