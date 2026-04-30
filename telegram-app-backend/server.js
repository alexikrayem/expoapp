// telegram-app-backend/server.js
require('dotenv').config();
require('./config/env');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const RateLimitRedis = require('rate-limit-redis');
const RedisStore = RateLimitRedis.default || RateLimitRedis;
const cookieParser = require('cookie-parser');
const compression = require('compression');

// Import our security middleware
const { validateTelegramAuth } = require('./middleware/authMiddleware');
const requestIdMiddleware = require('./middleware/requestId');
const logger = require('./services/logger');
const { getRedisClient, closeRedis } = require('./config/redis');
const { schedulePricingAdjustment } = require('./services/pricingQueue');
const { getQueueStats } = require('./services/queueMonitor');

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
const storageRoutes = require('./routes/storage');

// Import Telegram Bot Service
const telegramBotService = require('./services/telegramBot');
const telegramWebhookPath = telegramBotService.getWebhookPath?.() || '/api/telegram/webhook';

const app = express();
app.disable('x-powered-by');

const HTTP = Object.freeze({
  OK: Number.parseInt('200', 10),
  NOT_FOUND: Number.parseInt('404', 10),
  UNSUPPORTED_MEDIA_TYPE: Number.parseInt('415', 10),
  INTERNAL_SERVER_ERROR: Number.parseInt('500', 10),
  SERVICE_UNAVAILABLE: Number.parseInt('503', 10),
});

const TIME = Object.freeze({
  SECONDS_PER_MINUTE: Number.parseInt('60', 10),
  MILLISECONDS_PER_SECOND: Number.parseInt('1000', 10),
  RATE_LIMIT_WINDOW_MINUTES: Number.parseInt('15', 10),
});

const LIMITS = Object.freeze({
  DEV_MAX_REQUESTS: Number.parseInt('5000', 10),
  PROD_MAX_REQUESTS: Number.parseInt('100', 10),
  AUTH_MAX_ATTEMPTS: Number.parseInt('5', 10),
  HSTS_MAX_AGE_SECONDS: Number.parseInt('15552000', 10),
});

const DEFAULT_PORT = Number.parseInt('3001', 10);
const configuredPort = Number(process.env.PORT);
const PORT = Number.isFinite(configuredPort) && configuredPort > 0 ? configuredPort : DEFAULT_PORT;
if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
}

// Apply security middleware
// Check the environment to set appropriate limits
const IS_DEVELOPMENT = process.env.NODE_ENV === 'development';
const RATE_LIMIT_WINDOW_MS =
  TIME.RATE_LIMIT_WINDOW_MINUTES * TIME.SECONDS_PER_MINUTE * TIME.MILLISECONDS_PER_SECOND;

const redisClient = getRedisClient();
const rateLimitStore = redisClient
  ? new RedisStore({
    sendCommand: (...args) => redisClient.sendCommand(args),
  })
  : undefined;

// Apply general rate limiting
const limiter = rateLimit({
  windowMs: RATE_LIMIT_WINDOW_MS, // 15 minutes
  max: IS_DEVELOPMENT ? LIMITS.DEV_MAX_REQUESTS : LIMITS.PROD_MAX_REQUESTS, // General API limit
  store: rateLimitStore
});
app.use((req, res, next) => {
  // Exempt health/readiness checks and Telegram webhook from rate limiting
  if (req.path === '/health' || req.path === '/ready' || req.path.startsWith('/health/queue') || req.path.startsWith(telegramWebhookPath)) {
    return next();
  }
  return limiter(req, res, next);
});

// Create auth-specific rate limiter (Stricter in Prod, Open in Dev)
const authLimiter = rateLimit({
  windowMs: RATE_LIMIT_WINDOW_MS, // 15 minutes
  max: IS_DEVELOPMENT ? LIMITS.DEV_MAX_REQUESTS : LIMITS.AUTH_MAX_ATTEMPTS, // Auth attempts limit
  message: {
    error: 'Too many authentication attempts, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  store: rateLimitStore
});

// --- CORE MIDDLEWARE ---
// ✅ Updated only for development — production remains unchanged
const corsOptions = {
  origin: function (origin, callback) {
    const allowedOrigins = process.env.CORS_ORIGINS
      ? process.env.CORS_ORIGINS.split(',').map(url => url.trim())
      : [];

    if (process.env.NODE_ENV === 'production') {
      // 🚫 Keep current production behavior (strict)
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    } else {
      // 🧩 Development: allow localhost + ngrok
      if (
        !origin ||
        allowedOrigins.includes(origin) ||
        origin.startsWith('http://localhost') ||
        origin.startsWith('http://127.0.0.1') ||
        origin.endsWith('.ngrok-free.dev') // ✅ allow ngrok tunnels
      ) {
        callback(null, true);
      } else {
        console.warn(`Blocked by CORS (dev): ${origin}`);
        callback(new Error('Not allowed by CORS'));
      }
    }
  },
  credentials: true,
  optionsSuccessStatus: HTTP.OK,
};
const hpp = require('hpp');

// Configure Helmet with Content Security Policy (CSP) and hardening
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      frameSrc: ["'self'"],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: [],
    },
  },
  frameguard: { action: 'deny' },
  referrerPolicy: { policy: 'no-referrer' },
  hsts: process.env.NODE_ENV === 'production'
    ? { maxAge: LIMITS.HSTS_MAX_AGE_SECONDS, includeSubDomains: true, preload: true }
    : false,
}));

app.use(cookieParser());
app.use(cors(corsOptions));
app.use(compression());

// Add request ID for tracing
app.use(requestIdMiddleware);
// Structured request logging with latency
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const durationMs = Date.now() - start;
    logger.request(req, durationMs, res.statusCode);
  });
  next();
});

// Health check endpoints (before auth, no rate limit)
app.get('/health', (req, res) => {
  res.status(HTTP.OK).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

app.get('/ready', async (req, res) => {
  try {
    const db = require('./config/db');
    await db.query('SELECT 1');
    const redis = getRedisClient();
    const redisReady = Boolean(redis && redis.isReady);
    const redisStatus = redis ? (redisReady ? 'connected' : 'disconnected') : 'disabled';

    const statusCode = redis && !redisReady ? HTTP.SERVICE_UNAVAILABLE : HTTP.OK;
    const status = statusCode === HTTP.OK ? 'ready' : 'not ready';

    res.status(statusCode).json({
      status,
      database: 'connected',
      redis: redisStatus
    });
  } catch (error) {
    logger.error('Readiness check failed', error);
    res.status(HTTP.SERVICE_UNAVAILABLE).json({ status: 'not ready', database: 'disconnected' });
  }
});

app.get('/health/queue', async (req, res) => {
  try {
    const redis = getRedisClient();
    if (!redis) {
      return res.status(HTTP.OK).json({ status: 'disabled', redis: 'disabled', queues: {} });
    }

    const redisReady = Boolean(redis.isReady);
    const queueStats = await getQueueStats();

    return res.status(redisReady ? HTTP.OK : HTTP.SERVICE_UNAVAILABLE).json({
      status: redisReady ? 'ok' : 'degraded',
      redis: redisReady ? 'connected' : 'disconnected',
      queues: queueStats.queues || {}
    });
  } catch (error) {
    logger.error('Queue health check failed', error);
    return res.status(HTTP.INTERNAL_SERVER_ERROR).json({ status: 'error' });
  }
});

// 1. High Limit for Upload Routes (Suppliers & Admin)
// Must be applied BEFORE the global body parser to take effect
app.use(['/api/supplier', '/api/admin'], express.json({ limit: '50mb' }));
app.use(['/api/supplier', '/api/admin'], express.urlencoded({ extended: true, limit: '50mb' }));

// 2. Global Low Limit for everything else
app.use(express.json({ limit: '100kb' })); // Reduced from 10mb to 100kb for security
app.use(express.urlencoded({ extended: true, limit: '100kb' }));
app.use(hpp()); // Protect against HTTP Parameter Pollution attacks

// Enforce content-type for requests with bodies (protect against unexpected payloads)
app.use((req, res, next) => {
  const hasBody = Number(req.headers['content-length'] || 0) > 0;
  if (!hasBody) return next();

  if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
    const contentType = (req.headers['content-type'] || '').toLowerCase();
    const allowed =
      contentType.includes('application/json') ||
      contentType.includes('application/x-www-form-urlencoded') ||
      contentType.includes('multipart/form-data');

    if (!allowed && !req.path.startsWith(telegramWebhookPath)) {
      return res.status(HTTP.UNSUPPORTED_MEDIA_TYPE).json({ error: 'Unsupported content type' });
    }
  }
  return next();
});

// Serve static files from 'public' directory

app.use(express.static('public'));

// --- ROUTE DEFINITIONS ---

// 1. SPECIALIZED ROUTES (Auth, Admin) - These should be accessible without JWT validation
// These might have their own separate authentication logic (like login endpoints).
if (process.env.NODE_ENV !== 'production') console.log('✅ Applying SPECIALIZED routes...');
app.use('/api/auth', (req, res, next) => {
  res.set('Cache-Control', 'no-store');
  res.set('Pragma', 'no-cache');
  next();
});
app.use('/api/auth', authLimiter, authRoutes); // e.g., for JWT login/password, not Telegram based
app.use('/api/admin', adminRoutes);

// 2. PUBLIC ROUTES (No Telegram user validation needed)
// These routes are open and can be accessed without a valid Telegram session.
if (process.env.NODE_ENV !== 'production') console.log('✅ Applying PUBLIC routes...');
app.use('/api/products', productRoutes);
app.use('/api/cities', cityRoutes);
app.use('/api/suppliers', supplierRoutes);
app.use('/api/deals', dealRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/featured-items', featuredItemsRoutes);

// Telegram webhook endpoint (public, used only in webhook mode)
app.post(telegramWebhookPath, (req, res) => telegramBotService.handleWebhookUpdate(req, res));

// Add supplier-specific authenticated routes
app.use('/api/supplier', supplierRoutes);

// Storage routes (admin/supplier auth inside the router)
app.use('/api/storage', storageRoutes);

// 3. JWT AUTHENTICATION MIDDLEWARE - Apply only to routes that need protection
// Apply validation only to routes that should be protected (not /api/auth)
app.use('/api', (req, res, next) => {
  // Debug logging
  if (process.env.NODE_ENV !== 'production') {
    console.log(`[Middleware] Path: ${req.path}, Method: ${req.method}, Url: ${req.url}, BaseUrl: ${req.baseUrl}`);
  }

  // Skip JWT validation for auth routes only
  if (req.path.startsWith('/auth') || req.path.startsWith('/telegram') || req.path.startsWith('/delivery')) {
    if (process.env.NODE_ENV !== 'production') console.log('[Middleware] Skipping JWT for auth route');
    return next();
  }
  // Other routes apply JWT validation.
  if (process.env.NODE_ENV !== 'production') console.log('[Middleware] Validating JWT for:', req.path);
  validateTelegramAuth(req, res, next);
});
if (process.env.NODE_ENV !== 'production') console.log('🔒 JWT Authentication Middleware is now active for protected routes (excluding auth).');

// 4. PROTECTED ROUTES (Requires a valid authenticated user)
// These routes were already protected by the middleware above.
if (process.env.NODE_ENV !== 'production') console.log('✅ Applying PROTECTED routes...');
app.use('/api/cart', cartRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/user', userRoutes);
app.use('/api/favorites', favoritesRoutes);
app.use('/api/delivery', deliveryRoutes);




// --- ERROR HANDLERS ---
app.all('*', (req, res) => res.status(HTTP.NOT_FOUND).json({ error: 'Route not found' }));

app.use((error, req, res, next) => {
  logger.error('Global error handler', error, { requestId: req.requestId, path: req.path });

  const statusCode = error.statusCode || HTTP.INTERNAL_SERVER_ERROR;

  if (process.env.NODE_ENV === 'production') {
    const message = statusCode === HTTP.INTERNAL_SERVER_ERROR ? 'Internal Server Error' : (error.message || 'Error');
    return res.status(statusCode).json({ error: message, requestId: req.requestId });
  }

  // In development, send detailed error
  const message = error.message || 'Internal server error';
  const responseData = { error: message, requestId: req.requestId };

  if (statusCode === HTTP.INTERNAL_SERVER_ERROR) {
    responseData.details = error.message;
    responseData.stack = error.stack?.split('\n').slice(0, 5);
  }

  res.status(statusCode).json(responseData);
});

// Catch unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Promise Rejection', reason instanceof Error ? reason : new Error(String(reason)));
});

// Catch uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception', error);
  process.exit(1);
});

// --- SERVER STARTUP ---
const server = app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  telegramBotService.initializeBot?.().catch((error) => {
    logger.error('Telegram bot initialization failed', error);
  });
  schedulePricingAdjustment().catch((error) => {
    logger.error('Pricing job scheduling failed', error);
  });

  // Schedule background token cleanup running every 24 hours
  setInterval(() => {
    const tokenService = require('./services/tokenService');
    tokenService.cleanupExpiredTokens().catch((err) => {
      logger.error('Background token cleanup failed', err);
    });
  }, 24 * 60 * 60 * 1000);
});

// Graceful shutdown logic
const shutdown = (signal) => {
  console.log(`🛑 ${signal} received, shutting down gracefully...`);
  server.close(async () => {
    try {
      if (telegramBotService.shutdown) {
        await telegramBotService.shutdown();
      }
      await closeRedis();
    } catch (error) {
      logger.error('Shutdown cleanup failed', error);
    } finally {
      console.log('✅ Process terminated');
      process.exit(0);
    }
  });
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

module.exports = app;
