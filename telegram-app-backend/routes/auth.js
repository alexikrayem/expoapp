// routes/auth.js
const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../config/db');

// Supplier Login
router.post('/supplier/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }

        console.log(`🔐 Supplier login attempt for email: ${email}`);

        // Find supplier by email
        const supplierQuery = 'SELECT * FROM suppliers WHERE email = $1 AND is_active = true';
        const supplierResult = await db.query(supplierQuery, [email.toLowerCase()]);

        if (supplierResult.rows.length === 0) {
            console.log(`❌ Supplier not found or inactive: ${email}`);
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const supplier = supplierResult.rows[0];

        // Check password
        const isValidPassword = await bcrypt.compare(password, supplier.password_hash);
        if (!isValidPassword) {
            console.log(`❌ Invalid password for supplier: ${email}`);
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        console.log(`✅ Supplier login successful: ${supplier.name} (${email})`);

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

        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }

        // Find admin by email
        const adminQuery = 'SELECT * FROM admins WHERE email = $1 AND is_active = true';
        const adminResult = await db.query(adminQuery, [email.toLowerCase()]);

        if (adminResult.rows.length === 0) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const admin = adminResult.rows[0];

        // Check password
        const isValidPassword = await bcrypt.compare(password, admin.password_hash);
        if (!isValidPassword) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Generate JWT token
        const token = jwt.sign(
            {
                adminId: admin.id,
                email: admin.email,
                name: admin.full_name,
                role: 'admin'
            },
            process.env.JWT_ADMIN_SECRET,
            { expiresIn: '7d' }
        );

        res.json({
            token,
            admin: {
                id: admin.id,
                name: admin.full_name,
                email: admin.email,
                role: admin.role
            }
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

module.exports = router;