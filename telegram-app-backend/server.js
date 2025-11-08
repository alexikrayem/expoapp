// telegram-app-backend/server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

// Import our new security middleware
const { validateTelegramAuth } = require('./middleware/authMiddleware');

// Import all your route handlers
const authRoutes = require('./routes/auth');
const productRoutes = require('./routes/products');
const cartRoutes = require('./routes/cart');
const orderRoutes = require('./routes/orders');
const userRoutes = require('./routes/user');
const cityRoutes = require('./routes/cities');
const supplierRoutes = require('./routes/suppliers');
const dealRoutes = require('./routes/deals');
const searchRoutes = require('./routes/search');
const favoritesRoutes = require('./routes/favorites');
const featuredItemsRoutes = require('./routes/featuredItems');
const deliveryRoutes = require('./routes/delivery');
const adminRoutes = require('./routes/admin'); 

// Import Telegram Bot Service
const telegramBotService = require('./services/telegramBot');

const app = express();
const PORT = process.env.PORT || 3001;

// Apply security middleware
app.use(helmet()); // Add security headers

// Check the environment to set appropriate limits
const IS_DEVELOPMENT = process.env.NODE_ENV === 'development';
const DEV_MAX_REQUESTS = 5000;
const PROD_MAX_REQUESTS = 100;

// Apply general rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: IS_DEVELOPMENT ? DEV_MAX_REQUESTS : PROD_MAX_REQUESTS // General API limit
});
app.use(limiter);

// Create auth-specific rate limiter (Stricter in Prod, Open in Dev)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: IS_DEVELOPMENT ? DEV_MAX_REQUESTS : 5, // Auth attempts limit
  message: {
    error: 'Too many authentication attempts, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});



// --- CORE MIDDLEWARE ---
const corsOptions = {
    origin: function (origin, callback) {
        const allowedOrigins = process.env.CORS_ORIGINS ? 
            process.env.CORS_ORIGINS.split(',').map(url => url.trim()) : [];
        
        // In production, never allow all origins
        if (process.env.NODE_ENV === 'production') {
            if (!origin || allowedOrigins.includes(origin)) {
                callback(null, true);
            } else {
                callback(new Error('Not allowed by CORS'));
            }
        } else {
            // For development, be more permissive but still controlled
            // Only allow localhost origins in development
            if (!origin || allowedOrigins.includes(origin) || origin.startsWith('http://localhost') || origin.startsWith('http://127.0.0.1')) {
                callback(null, true);
            } else {
                callback(new Error('Not allowed by CORS'));
            }
        }
    },
    credentials: true,
    optionsSuccessStatus: 200
};
app.use(cors(corsOptions));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// --- ROUTE DEFINITIONS ---

// 1. PUBLIC ROUTES (No Telegram user validation needed)
// These routes are open and can be accessed without a valid Telegram session.
console.log('✅ Applying PUBLIC routes...');
app.get('/health', (req, res) => res.json({ status: 'OK' }));
app.use('/api/products', productRoutes);
app.use('/api/cities', cityRoutes);
app.use('/api/suppliers', supplierRoutes);
app.use('/api/deals', dealRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/featured-items', featuredItemsRoutes);

// Add supplier-specific authenticated routes
app.use('/api/supplier', supplierRoutes);
// 4. SPECIALIZED ROUTES (Auth, Admin)
// These might have their own separate authentication logic.
console.log('✅ Applying SPECIALIZED routes...');
app.use('/api/auth', authLimiter, authRoutes); // e.g., for JWT login/password, not Telegram based
app.use('/api/admin', adminRoutes);
// 2. TELEGRAM AUTHENTICATION MIDDLEWARE
// Any route defined *after* this line will be protected.
// It checks the 'X-Telegram-Init-Data' header. If valid, it adds `req.telegramUser`.
app.use('/api', validateTelegramAuth);
console.log('🔒 Telegram Authentication Middleware is now active for subsequent routes.');

// 3. PROTECTED ROUTES (Requires a valid Telegram user)
// These routes can now safely use `req.telegramUser` to identify the user.
console.log('✅ Applying PROTECTED routes...');
app.use('/api/cart', cartRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/user', userRoutes);
app.use('/api/favorites', favoritesRoutes);
app.use('/api/delivery', deliveryRoutes);




// --- ERROR HANDLERS ---
app.all('*', (req, res) => res.status(404).json({ error: 'Route not found' }));

app.use((error, req, res, next) => {
    console.error('Global error handler:', error);
    const statusCode = error.statusCode || 500;
    const message = error.message || 'Internal server error';
    res.status(statusCode).json({ error: message });
});


// --- SERVER STARTUP ---
const server = app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));

// Graceful shutdown logic
process.on('SIGTERM', () => {
    console.log('🛑 SIGTERM received, shutting down gracefully...');
    server.close(() => {
        console.log('✅ Process terminated');
        process.exit(0);
    });
});

process.on('SIGINT', () => {
    console.log('🛑 SIGINT received, shutting down gracefully...');
    server.close(() => {
        console.log('✅ Process terminated');
        process.exit(0);
    });
});

module.exports = app;