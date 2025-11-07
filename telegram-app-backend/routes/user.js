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
        city 
    } = profileData;

    // FIX: Provide default empty strings ('') for required fields to satisfy NOT NULL constraints.
    const p = {
        selected_city_id: selected_city_id,
        full_name: fullName || full_name || '', // Default to empty string
        phone_number: phoneNumber || phone_number || '', // Default to empty string
        address_line1: addressLine1 || address_line1 || '', // Default to empty string
        address_line2: addressLine2 || address_line2, // This one can be null
        city: city || '' // Default to empty string
    };

    const query = `
        INSERT INTO user_profiles (
            user_id, selected_city_id, full_name, phone_number, 
            address_line1, address_line2, city, created_at, updated_at
        ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, NOW(), NOW()
        )
        ON CONFLICT (user_id) 
        DO UPDATE SET 
            selected_city_id = COALESCE($2, user_profiles.selected_city_id),
            full_name = COALESCE($3, user_profiles.full_name),
            phone_number = COALESCE($4, user_profiles.phone_number),
            address_line1 = COALESCE($5, user_profiles.address_line1),
            address_line2 = COALESCE($6, user_profiles.address_line2),
            city = COALESCE($7, user_profiles.city),
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
        p.city
    ];
    const result = await db.query(query, values);
    return result.rows[0];
};

// Validation middleware for profile updates
const validateProfileUpdate = [
    body('full_name').optional().isLength({ max: 100 }).withMessage('Full name must be at most 100 characters'),
    body('phone_number').optional().isMobilePhone().withMessage('Phone number must be a valid mobile number'),
    body('address_line1').optional().isLength({ max: 255 }).withMessage('Address line 1 must be at most 255 characters'),
    body('address_line2').optional().isLength({ max: 255 }).withMessage('Address line 2 must be at most 255 characters'),
    body('city').optional().isLength({ max: 100 }).withMessage('City must be at most 100 characters'),
    body('selected_city_id').optional().isInt().withMessage('Selected city ID must be a valid integer')
];

// --- ROUTES ---

router.get('/profile', async (req, res) => {
    try {
        const { id: userId } = req.telegramUser;
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
        const { id: userId } = req.telegramUser;
        
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