// routes/user.js (SECURE VERSION)
const express = require('express');
const router = express.Router();
const db = require('../config/db');

// --- Helper Function for a clean and safe "UPSERT" ---
// It updates a profile if it exists, or inserts a new one if it doesn't.
const upsertUserProfile = async (userId, profileData) => {
    const { 
        selected_city_id, 
        fullName, 
        full_name,
        phoneNumber,
        phone_number,
        addressLine1,
        address_line1,
        addressLine2,
        address_line2,
        city 
    } = profileData;

    // Use a single, consistent name for each field
    const p = {
        selected_city_id: selected_city_id || null,
        full_name: fullName || full_name || null,
        phone_number: phoneNumber || phone_number || null,
        address_line1: addressLine1 || address_line1 || null,
        address_line2: addressLine2 || address_line2 || null,
        address_city_text: city || null
    };

    // This is a more robust way to handle dynamic updates than building strings.
    // It creates an INSERT statement that, upon conflict (user_id already exists),
    // performs an UPDATE instead.
    const query = `
        INSERT INTO user_profiles (
            user_id, selected_city_id, full_name, phone_number, 
            address_line1, address_line2, address_city_text, updated_at
        ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, NOW()
        )
        ON CONFLICT (user_id) 
        DO UPDATE SET 
            selected_city_id = COALESCE($2, user_profiles.selected_city_id),
            full_name = COALESCE($3, user_profiles.full_name),
            phone_number = COALESCE($4, user_profiles.phone_number),
            address_line1 = COALESCE($5, user_profiles.address_line1),
            address_line2 = COALESCE($6, user_profiles.address_line2),
            address_city_text = COALESCE($7, user_profiles.address_city_text),
            updated_at = NOW()
        RETURNING *;
    `;
    // The COALESCE function ensures that we don't overwrite existing data with NULL
    // if a field is not provided in the update.

    const values = [userId, p.selected_city_id, p.full_name, p.phone_number, p.address_line1, p.address_line2, p.address_city_text];
    const result = await db.query(query, values);
    return result.rows[0];
};


// --- ROUTES ---

// GET user profile
// The route path is now just '/profile' because the user is identified by the middleware.
router.get('/profile', async (req, res) => {
    try {
        // SECURE: Get the user ID from the middleware, not from the client's query.
        const { id: userId } = req.telegramUser;

        const query = `
            SELECT 
                up.*,
                c.name as selected_city_name
            FROM user_profiles up
            LEFT JOIN cities c ON up.selected_city_id = c.id
            WHERE up.user_id = $1
        `;

        const result = await db.query(query, [userId]);

        if (result.rows.length === 0) {
            // This is not an error. It just means the user is new.
            // The client-side will see the 404 and show the city selection modal.
            return res.status(404).json({ message: 'User profile not found. A new one will be created on first update.' });
        }

        res.json(result.rows[0]);

    } catch (error) {
        console.error('Error fetching user profile:', error);
        res.status(500).json({ error: 'Failed to fetch user profile' });
    }
});

// Update user profile (changed from POST to PUT for semantic correctness)
// The route path is now just '/profile'.
router.put('/profile', async (req, res) => {
    try {
        // SECURE: Get the user ID from the middleware, not the request body.
        const { id: userId } = req.telegramUser;
        const profileData = req.body;

        // The helper function handles both creating and updating in one go.
        const updatedProfile = await upsertUserProfile(userId, profileData);

        // We need to fetch the city name again to return the full profile object
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