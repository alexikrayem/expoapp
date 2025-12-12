// telegram-app-backend/server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const cookieParser = require('cookie-parser');

// Import our security middleware
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
if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
}

// Apply security middleware
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
// ✅ Updated only for development — production remains unchanged
const corsOptions = {
  origin: function (origin, callback) {
    const allowedOrigins = process.env.CORS_ORIGINS
      ? process.env.CORS_ORIGINS.split(',').map(url => url.trim())
      : [];

    // Allow requests from Telegram's OAuth domain - this is critical for Telegram Login Widget
    const isTelegramOauth = origin && origin.startsWith('https://oauth.telegram.org');

    if (process.env.NODE_ENV === 'production') {
      // 🚫 Keep current production behavior (strict) but allow Telegram OAuth
      if (!origin || allowedOrigins.includes(origin) || isTelegramOauth) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    } else {
      // 🧩 Development: allow localhost + ngrok + Telegram OAuth
      if (
        !origin ||
        allowedOrigins.includes(origin) ||
        origin.startsWith('http://localhost') ||
        origin.startsWith('http://127.0.0.1') ||
        origin.endsWith('.ngrok-free.dev') || // ✅ allow ngrok tunnels
        isTelegramOauth // ✅ allow Telegram OAuth
      ) {
        callback(null, true);
      } else {
        console.warn(`Blocked by CORS (dev): ${origin}`);
        callback(new Error('Not allowed by CORS'));
      }
    }
  },
  credentials: true,
  optionsSuccessStatus: 200,
};
const hpp = require('hpp');
const xss = require('xss-clean');

// Configure Helmet with Content Security Policy (CSP)
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://telegram.org", "https://oauth.telegram.org"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "https://api.telegram.org"],
      frameSrc: ["'self'", "https://oauth.telegram.org"], // Allow Telegram Login Widget
      objectSrc: ["'none'"],
      upgradeInsecureRequests: [],
    },
  },
}));

app.use(cookieParser());
app.use(cors(corsOptions));

// 1. High Limit for Upload Routes (Suppliers & Admin)
// Must be applied BEFORE the global body parser to take effect
app.use(['/api/supplier', '/api/admin'], express.json({ limit: '50mb' }));
app.use(['/api/supplier', '/api/admin'], express.urlencoded({ extended: true, limit: '50mb' }));

// 2. Global Low Limit for everything else
app.use(express.json({ limit: '100kb' })); // Reduced from 10mb to 100kb for security
app.use(express.urlencoded({ extended: true, limit: '100kb' }));
app.use(hpp()); // Protect against HTTP Parameter Pollution attacks
app.use(xss()); // Sanitize user input to prevent XSS attacks

// Serve static files from 'public' directory

// Dynamic Telegram Widget Route
// Serves the widget HTML with the correct Bot Username from environment variables
app.get('/telegram-widget.html', (req, res) => {
  const fs = require('fs');
  const path = require('path');
  const filePath = path.join(__dirname, 'public', 'telegram-widget.html');

  fs.readFile(filePath, 'utf8', (err, data) => {
    if (err) {
      console.error('Error reading widget file:', err);
      return res.status(500).send('Error loading login widget');
    }

    const botUsername = process.env.TELEGRAM_BOT_USERNAME || 'DentAppBot';
    // Replace the placeholder with the actual username
    const result = data.replace(
      "const BOT_USERNAME = 'DentAppBot';",
      `const BOT_USERNAME = '${botUsername}';`
    );

    res.set('Content-Type', 'text/html');
    res.send(result);
  });
});

app.use(express.static('public'));

// --- ROUTE DEFINITIONS ---

// 1. SPECIALIZED ROUTES (Auth, Admin) - These should be accessible without JWT validation
// These might have their own separate authentication logic (like login endpoints).
console.log('✅ Applying SPECIALIZED routes...');
app.use('/api/auth', authLimiter, authRoutes); // e.g., for JWT login/password, not Telegram based
app.use('/api/admin', adminRoutes);

// 2. PUBLIC ROUTES (No Telegram user validation needed)
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

// 3. JWT AUTHENTICATION MIDDLEWARE - Apply only to routes that need protection
// Apply validation only to routes that should be protected (not /api/auth)
app.use('/api', (req, res, next) => {
  // Skip JWT validation for auth routes only
  if (req.path.startsWith('/auth')) {
    return next();
  }
  // For other routes, apply the JWT validation
  validateTelegramAuth(req, res, next);
});
console.log('🔒 JWT Authentication Middleware is now active for protected routes (excluding auth).');

// 4. PROTECTED ROUTES (Requires a valid authenticated user)
// These routes were already protected by the middleware above.
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

app.use((err, req, res, next) => {
  console.error('--- UNHANDLED SERVER CRASH (HIGH PRIORITY) ---');
  console.error(err.stack); // Log the full stack trace

  // In production, send a detailed error message ONLY if debugging
  if (process.env.NODE_ENV !== 'production' || process.env.DEBUG_MODE === 'true') {
    return res.status(500).json({
      error: 'Fatal Server Error',
      details: err.message,
      stack: err.stack.split('\n').slice(0, 5) // Send a slice of the stack trace
    });
  }

  res.status(500).json({ error: 'Internal Server Error.' });
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
