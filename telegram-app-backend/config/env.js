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

const ACCESS_SECRET_KEYS = [
  'JWT_SECRET',
  'JWT_CUSTOMER_SECRET',
  'JWT_ADMIN_SECRET',
  'JWT_SUPPLIER_SECRET',
  'JWT_DELIVERY_SECRET'
];

const REFRESH_SECRET_KEYS = [
  'JWT_REFRESH_SECRET',
  'JWT_CUSTOMER_REFRESH_SECRET',
  'JWT_ADMIN_REFRESH_SECRET',
  'JWT_SUPPLIER_REFRESH_SECRET',
  'JWT_DELIVERY_REFRESH_SECRET'
];

function hasAnySet(names) {
  return names.some((name) => isSet(process.env[name]));
}

function hasWildcardCorsOrigin() {
  return String(process.env.CORS_ORIGINS || '')
    .split(',')
    .map((value) => value.trim())
    .includes('*');
}

function throwForFailedChecks(checks) {
  for (const check of checks) {
    if (check.condition) {
      throw new Error(check.message);
    }
  }
}

function warnForFailedChecks(checks) {
  for (const check of checks) {
    if (check.condition) {
      console.warn(check.message);
    }
  }
}

function getProductionBlockingChecks() {
  return [
    {
      condition: !hasAnySet(REFRESH_SECRET_KEYS),
      message: '[ENV] Missing dedicated JWT refresh secret(s). Set JWT_REFRESH_SECRET or role-specific refresh secrets in production.',
    },
    {
      condition:
        isSet(process.env.JWT_SECRET) &&
        isSet(process.env.JWT_REFRESH_SECRET) &&
        process.env.JWT_SECRET === process.env.JWT_REFRESH_SECRET,
      message: '[ENV] JWT_SECRET and JWT_REFRESH_SECRET must not be identical in production.',
    },
    {
      condition: process.env.EXPOSE_OTP === 'true',
      message: '[ENV] EXPOSE_OTP must be false in production.',
    },
    {
      condition: !isSet(process.env.OTP_HASH_SECRET),
      message: '[ENV] OTP_HASH_SECRET is required in production.',
    },
    {
      condition: process.env.EXPOSE_REFRESH_TOKEN_IN_BODY === 'true',
      message: '[ENV] EXPOSE_REFRESH_TOKEN_IN_BODY must be false in production.',
    },
    {
      condition: !isSet(process.env.CORS_ORIGINS),
      message: '[ENV] CORS_ORIGINS is required in production.',
    },
    {
      condition: hasWildcardCorsOrigin(),
      message: '[ENV] CORS_ORIGINS cannot include wildcard (*) in production.',
    },
  ];
}

function getProductionWarningChecks() {
  return [
    {
      condition: isSet(process.env.JWT_ISSUER) && !isSet(process.env.JWT_AUDIENCE),
      message: '[ENV] JWT_ISSUER is set without JWT_AUDIENCE. Consider setting both for stricter validation.',
    },
    {
      condition: !isSet(process.env.TELEGRAM_WEBHOOK_URL),
      message: '[ENV] TELEGRAM_WEBHOOK_URL is not set in production. Bot will fall back to polling.',
    },
    {
      condition: isSet(process.env.TELEGRAM_WEBHOOK_URL) && !isSet(process.env.TELEGRAM_WEBHOOK_SECRET),
      message: '[ENV] TELEGRAM_WEBHOOK_SECRET is not set in production. Webhook requests are not origin-verified.',
    },
    {
      condition: !isSet(process.env.REDIS_URL),
      message: '[ENV] REDIS_URL is not set in production. Rate limiting and caching will use in-memory stores.',
    },
    {
      condition: !isSet(process.env.PRICING_ADJUSTMENT_CRON),
      message: '[ENV] PRICING_ADJUSTMENT_CRON not set. Using default schedule (every 6 hours).',
    },
    {
      condition: !isSet(process.env.SUPABASE_URL) || !isSet(process.env.SUPABASE_SERVICE_ROLE_KEY),
      message: '[ENV] Supabase storage is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.',
    },
    {
      condition: !isSet(process.env.SUPABASE_STORAGE_BUCKET),
      message: '[ENV] SUPABASE_STORAGE_BUCKET not set. Using default bucket name.',
    },
    {
      condition: !isSet(process.env.OPENSEARCH_URL),
      message: '[ENV] OPENSEARCH_URL not set. Search will use Postgres fallback only.',
    },
    {
      condition: isSet(process.env.EMBEDDINGS_URL) && !isSet(process.env.EMBEDDINGS_DIM),
      message: '[ENV] EMBEDDINGS_DIM not set. OpenSearch kNN mapping needs the embedding dimension.',
    },
    {
      condition: process.env.ENFORCE_ACCOUNT_STATUS === 'false',
      message: '[ENV] ENFORCE_ACCOUNT_STATUS is disabled in production. Inactive accounts may retain access.',
    },
  ];
}

function warnIfWeakBcryptRounds() {
  if (!isSet(process.env.BCRYPT_SALT_ROUNDS)) {
    return;
  }

  const rounds = Number(process.env.BCRYPT_SALT_ROUNDS);
  if (Number.isFinite(rounds) && rounds < 10) {
    console.warn('[ENV] BCRYPT_SALT_ROUNDS is below 10. Consider increasing for stronger hashing.');
  }
}

// Always required (matches current DB config behavior)
ensureAll(['DATABASE_URL'], 'DATABASE_URL', { requiredInProd: true });

// JWT access and refresh secrets (role-specific or shared)
ensureAny(
  ACCESS_SECRET_KEYS,
  'JWT access secret',
  { requiredInProd: true }
);

ensureAny(
  [...REFRESH_SECRET_KEYS, 'JWT_SECRET'],
  'JWT refresh secret',
  { requiredInProd: true }
);

function runProductionEnvChecks() {
  if (!isProd) return;
  throwForFailedChecks(getProductionBlockingChecks());
  warnForFailedChecks(getProductionWarningChecks());
  warnIfWeakBcryptRounds();
}

runProductionEnvChecks();

module.exports = { isProd };
