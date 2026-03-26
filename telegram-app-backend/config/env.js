// config/env.js
// Centralized environment validation with production-safe defaults.

const isProd = process.env.NODE_ENV === 'production';

const isSet = (value) => typeof value === 'string' && value.trim().length > 0;

const ensureAll = (names, label, { requiredInProd = false } = {}) => {
  const missing = names.filter((name) => !isSet(process.env[name]));
  if (missing.length === 0) return;

  const message = `[ENV] Missing ${label || 'required variables'}: ${missing.join(', ')}`;
  if (isProd || requiredInProd) {
    throw new Error(message);
  }
  console.warn(message);
};

const ensureAny = (names, label, { requiredInProd = false } = {}) => {
  const hasAny = names.some((name) => isSet(process.env[name]));
  if (hasAny) return;

  const message = `[ENV] Missing ${label || 'required variables'} (none of: ${names.join(', ')})`;
  if (isProd || requiredInProd) {
    throw new Error(message);
  }
  console.warn(message);
};

// Always required (matches current DB config behavior)
ensureAll(['DATABASE_URL'], 'DATABASE_URL', { requiredInProd: true });

// JWT access and refresh secrets (role-specific or shared)
ensureAny(
  [
    'JWT_SECRET',
    'JWT_CUSTOMER_SECRET',
    'JWT_ADMIN_SECRET',
    'JWT_SUPPLIER_SECRET',
    'JWT_DELIVERY_SECRET'
  ],
  'JWT access secret',
  { requiredInProd: true }
);

ensureAny(
  [
    'JWT_REFRESH_SECRET',
    'JWT_CUSTOMER_REFRESH_SECRET',
    'JWT_ADMIN_REFRESH_SECRET',
    'JWT_SUPPLIER_REFRESH_SECRET',
    'JWT_DELIVERY_REFRESH_SECRET',
    'JWT_SECRET'
  ],
  'JWT refresh secret',
  { requiredInProd: true }
);

if (isProd && isSet(process.env.JWT_ISSUER) && !isSet(process.env.JWT_AUDIENCE)) {
  console.warn('[ENV] JWT_ISSUER is set without JWT_AUDIENCE. Consider setting both for stricter validation.');
}

// Safety warnings
if (isProd && process.env.EXPOSE_OTP === 'true') {
  console.warn('[ENV] EXPOSE_OTP is true in production. Disable immediately.');
}

if (isProd && !isSet(process.env.CORS_ORIGINS)) {
  console.warn('[ENV] CORS_ORIGINS is not set in production. Default behavior may block requests.');
}

if (isProd && !isSet(process.env.TELEGRAM_WEBHOOK_URL)) {
  console.warn('[ENV] TELEGRAM_WEBHOOK_URL is not set in production. Bot will fall back to polling.');
}

if (isProd && !isSet(process.env.REDIS_URL)) {
  console.warn('[ENV] REDIS_URL is not set in production. Rate limiting and caching will use in-memory stores.');
}

if (isProd && !isSet(process.env.PRICING_ADJUSTMENT_CRON)) {
  console.warn('[ENV] PRICING_ADJUSTMENT_CRON not set. Using default schedule (every 6 hours).');
}

if (isProd && (!isSet(process.env.SUPABASE_URL) || !isSet(process.env.SUPABASE_SERVICE_ROLE_KEY))) {
  console.warn('[ENV] Supabase storage is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.');
}

if (isProd && !isSet(process.env.SUPABASE_STORAGE_BUCKET)) {
  console.warn('[ENV] SUPABASE_STORAGE_BUCKET not set. Using default bucket name.');
}

if (isProd && !isSet(process.env.OPENSEARCH_URL)) {
  console.warn('[ENV] OPENSEARCH_URL not set. Search will use Postgres fallback only.');
}

if (isProd && isSet(process.env.EMBEDDINGS_URL) && !isSet(process.env.EMBEDDINGS_DIM)) {
  console.warn('[ENV] EMBEDDINGS_DIM not set. OpenSearch kNN mapping needs the embedding dimension.');
}

if (isProd && isSet(process.env.BCRYPT_SALT_ROUNDS)) {
  const rounds = Number(process.env.BCRYPT_SALT_ROUNDS);
  if (Number.isFinite(rounds) && rounds < 10) {
    console.warn('[ENV] BCRYPT_SALT_ROUNDS is below 10. Consider increasing for stronger hashing.');
  }
}

if (isProd && process.env.ENFORCE_ACCOUNT_STATUS === 'false') {
  console.warn('[ENV] ENFORCE_ACCOUNT_STATUS is disabled in production. Inactive accounts may retain access.');
}

module.exports = { isProd };
