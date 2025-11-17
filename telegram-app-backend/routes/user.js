// routes/user.js (FINAL ROBUST VERSION)
const express = require('express');
const { body, validationResult } = require('express-validator');
const router = express.Router();
const db = require('../config/db');

// --- Helper Function for a clean and safe "UPSERT" ---
const upsertUserProfile = async (userId, profileData) => {
    const {
        selected_city_id,
        fullName, full_name,
        phoneNumber, phone_number,
        addressLine1, address_line1,
        addressLine2, address_line2,
        city,
        clinic_name,
        clinic_phone,
        clinic_address_line1,
        clinic_address_line2,
        clinic_city,
        clinic_country,
        clinic_coordinates,
        clinic_license_number,
        clinic_specialization,
        professional_role,
        years_of_experience,
        education_background,
        date_of_birth,
        gender,
        professional_license_number
    } = profileData;

    // FIX: Provide default empty strings ('') for required fields to satisfy NOT NULL constraints.
    const p = {
        selected_city_id: selected_city_id,
        full_name: fullName || full_name || '', // Default to empty string
        phone_number: phoneNumber || phone_number || '', // Default to empty string
        address_line1: addressLine1 || address_line1 || '', // Default to empty string
        address_line2: addressLine2 || address_line2, // This one can be null
        city: city || '', // Default to empty string
        clinic_name: clinic_name || '',
        clinic_phone: clinic_phone || '',
        clinic_address_line1: clinic_address_line1 || '',
        clinic_address_line2: clinic_address_line2,
        clinic_city: clinic_city || '',
        clinic_country: clinic_country || '',
        clinic_coordinates: clinic_coordinates,
        clinic_license_number: clinic_license_number || '',
        clinic_specialization: clinic_specialization || '',
        professional_role: professional_role || '',
        years_of_experience: years_of_experience,
        education_background: education_background,
        date_of_birth: date_of_birth,
        gender: gender,
        professional_license_number: professional_license_number
    };

    // Check if profile is completed based on required fields
    const isProfileCompleted = !!(p.full_name && p.phone_number && p.clinic_name && p.clinic_phone);

    const query = `
        INSERT INTO user_profiles (
            user_id, selected_city_id, full_name, phone_number,
            address_line1, address_line2, city, clinic_name, clinic_phone,
            clinic_address_line1, clinic_address_line2, clinic_city, clinic_country,
            clinic_coordinates, clinic_license_number, clinic_specialization,
            professional_role, years_of_experience, education_background,
            date_of_birth, gender, professional_license_number, profile_completed,
            created_at, updated_at
        ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16,
            $17, $18, $19, $20, $21, $22, $23, NOW(), NOW()
        )
        ON CONFLICT (user_id)
        DO UPDATE SET
            selected_city_id = COALESCE($2, user_profiles.selected_city_id),
            full_name = COALESCE($3, user_profiles.full_name),
            phone_number = COALESCE($4, user_profiles.phone_number),
            address_line1 = COALESCE($5, user_profiles.address_line1),
            address_line2 = COALESCE($6, user_profiles.address_line2),
            city = COALESCE($7, user_profiles.city),
            clinic_name = COALESCE($8, user_profiles.clinic_name),
            clinic_phone = COALESCE($9, user_profiles.clinic_phone),
            clinic_address_line1 = COALESCE($10, user_profiles.clinic_address_line1),
            clinic_address_line2 = COALESCE($11, user_profiles.clinic_address_line2),
            clinic_city = COALESCE($12, user_profiles.clinic_city),
            clinic_country = COALESCE($13, user_profiles.clinic_country),
            clinic_coordinates = COALESCE($14, user_profiles.clinic_coordinates),
            clinic_license_number = COALESCE($15, user_profiles.clinic_license_number),
            clinic_specialization = COALESCE($16, user_profiles.clinic_specialization),
            professional_role = COALESCE($17, user_profiles.professional_role),
            years_of_experience = COALESCE($18, user_profiles.years_of_experience),
            education_background = COALESCE($19, user_profiles.education_background),
            date_of_birth = COALESCE($20, user_profiles.date_of_birth),
            gender = COALESCE($21, user_profiles.gender),
            professional_license_number = COALESCE($22, user_profiles.professional_license_number),
            profile_completed = $23,
            updated_at = NOW()
        RETURNING *;
    `;

    // The COALESCE function in the UPDATE part is still useful.
    // It prevents an existing value from being overwritten with an empty string
    // if the update payload doesn't include that field.

    const values = [
        userId,
        p.selected_city_id,
        p.full_name,
        p.phone_number,
        p.address_line1,
        p.address_line2,
        p.city,
        p.clinic_name,
        p.clinic_phone,
        p.clinic_address_line1,
        p.clinic_address_line2,
        p.clinic_city,
        p.clinic_country,
        p.clinic_coordinates,
        p.clinic_license_number,
        p.clinic_specialization,
        p.professional_role,
        p.years_of_experience,
        p.education_background,
        p.date_of_birth,
        p.gender,
        p.professional_license_number,
        isProfileCompleted
    ];
    const result = await db.query(query, values);
    return result.rows[0];
};

// Validation middleware for profile updates
const validateProfileUpdate = [
    body('full_name')
        .optional()
        .trim()
        .isLength({ max: 100 })
        .withMessage('Full name must be at most 100 characters')
        .matches(/^[a-zA-Z\s\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]+$/)
        .withMessage('Full name contains invalid characters'),
    body('phone_number')
        .optional()
        .trim()
        .isMobilePhone(['ar-SA', 'ar-EG', 'ar-IQ', 'ar-JO', 'ar-KW', 'ar-LB', 'ar-LY', 'ar-MA', 'ar-QA', 'ar-SY', 'ar-TN', 'ar-YE', 'en-US'])
        .withMessage('Phone number must be a valid mobile number'),
    body('address_line1')
        .optional()
        .trim()
        .isLength({ max: 255 })
        .withMessage('Address line 1 must be at most 255 characters'),
    body('address_line2')
        .optional()
        .trim()
        .isLength({ max: 255 })
        .withMessage('Address line 2 must be at most 255 characters'),
    body('city')
        .optional()
        .trim()
        .isLength({ max: 100 })
        .withMessage('City must be at most 100 characters'),
    body('selected_city_id')
        .optional()
        .isInt({ min: 1 })
        .withMessage('Selected city ID must be a valid positive integer')
];

// --- ROUTES ---

router.get('/profile', async (req, res) => {
    try {
        const { userId } = req.user;
        const query = `
            SELECT up.*, c.name as selected_city_name
            FROM user_profiles up
            LEFT JOIN cities c ON up.selected_city_id = c.id
            WHERE up.user_id = $1
        `;
        const result = await db.query(query, [userId]);
        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'User profile not found.' });
        }
        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error fetching user profile:', error);
        res.status(500).json({ error: 'Failed to fetch user profile' });
    }
});

router.put('/profile', validateProfileUpdate, async (req, res) => {
    try {
        const { userId } = req.user;

        // Check for validation errors
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ error: 'Validation failed', details: errors.array() });
        }

        const profileData = req.body;

        const updatedProfile = await upsertUserProfile(userId, profileData);

        const finalProfileQuery = `
            SELECT up.*, c.name as selected_city_name
            FROM user_profiles up
            LEFT JOIN cities c ON up.selected_city_id = c.id
            WHERE up.user_id = $1
        `;
        const finalResult = await db.query(finalProfileQuery, [userId]);
        res.json(finalResult.rows[0]);
    } catch (error) {
        console.error('Error updating user profile:', error);
        res.status(500).json({ error: 'Failed to update user profile' });
    }
});

module.exports = router;