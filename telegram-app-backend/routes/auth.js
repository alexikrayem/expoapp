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


// --- Telegram Login Widget Endpoint ---
const { validateTelegramLoginWidgetData } = require('../src/utils/telegramAuth');

router.post('/telegram-login-widget', async (req, res) => {
  try {
    const isDevRequest = req.header('X-Dev-Bypass-Auth');
    const isLocalhost = req.ip === '127.0.0.1' || req.ip === '::1' || req.ip.startsWith('::ffff:127.0.0.1');

    let authData;

    // Simplified Dev Bypass
    if (process.env.NODE_ENV === 'development' && !req.body.authData) {
      console.warn('⚠️  Simplified dev bypass active for Telegram Login Widget.');
      authData = {
        id: 123456789,
        first_name: 'Local',
        last_name: 'Dev',
        username: 'localdev',
        auth_date: Math.floor(Date.now() / 1000)
      };
    } else {
      const { authData: receivedAuthData } = req.body;
      if (!receivedAuthData) return res.status(400).json({ error: 'Missing authData' });
      authData = receivedAuthData;
    }

    const fullName = [authData.first_name, authData.last_name].filter(Boolean).join(' ');

    // user lookup / creation logic remains unchanged
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
      const insertUserQuery = `
        INSERT INTO user_profiles (user_id, full_name, profile_completed, created_at, updated_at)
        VALUES ($1, $2, false, NOW(), NOW()) RETURNING *;
      `;
      const newUser = await db.query(insertUserQuery, [authData.id, fullName]);
      user = newUser.rows[0];
    }

    const { accessToken, refreshToken } = generateTokens(
      { userId: user.user_id, telegramId: user.user_id, role: 'customer' },
      'CUSTOMER'
    );

    res.json({
      accessToken,
      refreshToken,
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
// --- END Telegram Login Widget Endpoint ---






module.exports = router;