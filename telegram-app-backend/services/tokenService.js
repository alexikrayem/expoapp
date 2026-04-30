// services/tokenService.js
// Refresh token rotation + storage

const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const db = require('../config/db');
const { signJwt, verifyJwt } = require('./jwtService');

const ACCESS_TOKEN_TTL = '15m';
const REFRESH_TOKEN_TTL = '7d';

const hashToken = (token) =>
  crypto.createHash('sha256').update(token).digest('hex');

const normalizeRoleKey = (role) =>
  String(role || '').toUpperCase().replace(/[^A-Z_]/g, '');

const normalizeRoleValue = (role) =>
  String(role || '').toLowerCase();

const getAccessSecret = (roleKey) =>
  process.env[`JWT_${roleKey}_SECRET`] || process.env.JWT_SECRET;

const getRefreshSecret = (roleKey) =>
  process.env[`JWT_${roleKey}_REFRESH_SECRET`] ||
  process.env.JWT_REFRESH_SECRET ||
  getAccessSecret(roleKey);

const extractSubjectId = (payload) =>
  payload.userId ||
  payload.adminId ||
  payload.supplierId ||
  payload.deliveryAgentId ||
  payload.sub;

const buildAccessPayload = (decoded) => {
  const { type, jti, iat, exp, ...payload } = decoded;
  return payload;
};

const issueTokens = async ({ payload, role, ip, userAgent, executor = db }) => {
  const roleKey = normalizeRoleKey(role || payload.role);
  const accessSecret = getAccessSecret(roleKey);
  const refreshSecret = getRefreshSecret(roleKey);

  if (!accessSecret || !refreshSecret) {
    throw new Error('JWT secrets are not configured');
  }

  const accessPayload = { ...payload, type: 'access' };
  const accessToken = signJwt(accessPayload, accessSecret, { expiresIn: ACCESS_TOKEN_TTL });
  const refreshJti = crypto.randomUUID();
  const refreshPayload = { ...payload, type: 'refresh', jti: refreshJti };
  const refreshToken = signJwt(refreshPayload, refreshSecret, { expiresIn: REFRESH_TOKEN_TTL });

  const decoded = jwt.decode(refreshToken);
  const expiresAt = decoded?.exp
    ? new Date(decoded.exp * 1000)
    : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  const subjectId = extractSubjectId(payload);
  if (!subjectId) {
    throw new Error('Token subject is missing');
  }

  await executor.query(
    `
      INSERT INTO refresh_tokens (
        subject_id, role, token_hash, jti, expires_at,
        created_at, last_used_at, ip, user_agent
      ) VALUES ($1, $2, $3, $4, $5, NOW(), NOW(), $6, $7)
    `,
    [
      subjectId,
      normalizeRoleValue(payload.role || role),
      hashToken(refreshToken),
      refreshJti,
      expiresAt,
      ip || null,
      userAgent || null,
    ]
  );

  return { accessToken, refreshToken, refreshJti };
};

const revokeAllForSubject = async (subjectId, role, executor = db) => {
  if (!subjectId || !role) return;
  await executor.query(
    `
      UPDATE refresh_tokens
      SET revoked_at = NOW()
      WHERE subject_id = $1 AND role = $2 AND revoked_at IS NULL
    `,
    [subjectId, normalizeRoleValue(role)]
  );
};

const revokeRefreshToken = async (token, executor = db) => {
  if (!token) return;
  const tokenHash = hashToken(token);
  await executor.query(
    `
      UPDATE refresh_tokens
      SET revoked_at = NOW()
      WHERE token_hash = $1 AND revoked_at IS NULL
    `,
    [tokenHash]
  );
};

async function cleanupExpiredTokens(executor = db) {
  try {
    const result = await executor.query(`
      DELETE FROM refresh_tokens
      WHERE (revoked_at IS NOT NULL AND revoked_at < NOW() - INTERVAL '30 days')
         OR (expires_at < NOW() - INTERVAL '7 days')
    `);
    if (result.rowCount > 0) {
      const logger = require('./logger');
      logger.info(`Cleaned up ${result.rowCount} expired/revoked refresh tokens`);
    }
  } catch (error) {
    const logger = require('./logger');
    logger.error('Failed to run token cleanup job', error);
  }
}

function getRoleFromUnsafeRefreshToken(token) {
  const unsafeDecoded = jwt.decode(token);
  if (!unsafeDecoded || !unsafeDecoded.role) {
    throw new Error('Invalid refresh token');
  }
  return unsafeDecoded.role;
}

function verifyRefreshTokenOrThrow(token, refreshSecret) {
  try {
    return verifyJwt(token, refreshSecret);
  } catch (error) {
    throw new Error('Invalid or expired refresh token');
  }
}

function validateDecodedRefreshToken(decoded) {
  if (decoded.type !== 'refresh') {
    throw new Error('Invalid token type');
  }

  const subjectId = extractSubjectId(decoded);
  if (!subjectId) {
    throw new Error('Token subject is missing');
  }

  return subjectId;
}

async function fetchStoredRefreshToken(client, tokenHash) {
  const existing = await client.query(
    `
      SELECT token_hash, revoked_at, expires_at, ip, user_agent
      FROM refresh_tokens
      WHERE token_hash = $1
      FOR UPDATE
    `,
    [tokenHash]
  );

  return existing.rows[0] || null;
}

const isStoredTokenExpired = (existingToken) =>
  Boolean(existingToken.expires_at) &&
  new Date(existingToken.expires_at) < new Date();

const isIpBindingMismatch = ({ existingToken, ip }) => {
  if (process.env.REFRESH_TOKEN_IP_BINDING !== 'true') {
    return false;
  }

  if (!existingToken.ip || !ip) {
    return false;
  }

  return existingToken.ip !== ip;
};

const isUserAgentBindingMismatch = ({ existingToken, userAgent }) => {
  if (process.env.REFRESH_TOKEN_UA_BINDING !== 'true') {
    return false;
  }

  if (!existingToken.user_agent || !userAgent) {
    return false;
  }

  return existingToken.user_agent !== userAgent;
};

async function throwRefreshTokenReuseDetected({ subjectId, role, executor }) {
  await revokeAllForSubject(subjectId, role, executor);
  throw new Error('Refresh token reuse detected');
}

async function enforceRefreshTokenBinding({
  existingToken,
  subjectId,
  role,
  token,
  ip,
  userAgent,
  executor,
}) {
  if (!existingToken) {
    return;
  }

  if (existingToken.revoked_at) {
    await throwRefreshTokenReuseDetected({ subjectId, role, executor });
  }

  if (isStoredTokenExpired(existingToken)) {
    await revokeRefreshToken(token, executor);
    throw new Error('Refresh token expired');
  }

  if (isIpBindingMismatch({ existingToken, ip })) {
    await throwRefreshTokenReuseDetected({ subjectId, role, executor });
  }

  if (isUserAgentBindingMismatch({ existingToken, userAgent })) {
    await throwRefreshTokenReuseDetected({ subjectId, role, executor });
  }
}

function getLegacyTokenMeta(decoded) {
  return {
    legacyJti: decoded.jti || crypto.randomUUID(),
    legacyExpiresAt: decoded.exp
      ? new Date(decoded.exp * 1000)
      : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  };
}

async function updateExistingTokenRecord({
  client,
  tokenHash,
  refreshJti,
  ip,
  userAgent,
}) {
  await client.query(
    `
      UPDATE refresh_tokens
      SET revoked_at = NOW(), replaced_by = $2, last_used_at = NOW(), ip = $3, user_agent = $4
      WHERE token_hash = $1
    `,
    [tokenHash, refreshJti, ip || null, userAgent || null]
  );
}

async function insertReplacedTokenRecord({
  client,
  tokenHash,
  decoded,
  refreshJti,
  subjectId,
  ip,
  userAgent,
}) {
  const { legacyJti, legacyExpiresAt } = getLegacyTokenMeta(decoded);

  await client.query(
    `
      INSERT INTO refresh_tokens (
        subject_id, role, token_hash, jti, expires_at,
        revoked_at, replaced_by, created_at, last_used_at, ip, user_agent
      ) VALUES ($1, $2, $3, $4, $5, NOW(), $6, NOW(), NOW(), $7, $8)
      ON CONFLICT (token_hash)
      DO UPDATE SET
        revoked_at = NOW(),
        replaced_by = EXCLUDED.replaced_by,
        last_used_at = NOW(),
        ip = EXCLUDED.ip,
        user_agent = EXCLUDED.user_agent
    `,
    [
      subjectId,
      normalizeRoleValue(decoded.role),
      tokenHash,
      legacyJti,
      legacyExpiresAt,
      refreshJti,
      ip || null,
      userAgent || null,
    ]
  );
}

async function upsertRotatedTokenRecord({
  client,
  existingToken,
  tokenHash,
  decoded,
  refreshJti,
  subjectId,
  ip,
  userAgent,
}) {
  if (existingToken) {
    await updateExistingTokenRecord({
      client,
      tokenHash,
      refreshJti,
      ip,
      userAgent,
    });
    return;
  }

  await insertReplacedTokenRecord({
    client,
    tokenHash,
    decoded,
    refreshJti,
    subjectId,
    ip,
    userAgent,
  });
}

async function prepareRotationContext({
  client,
  token,
  decoded,
  subjectId,
  ip,
  userAgent,
}) {
  const tokenHash = hashToken(token);
  const existingToken = await fetchStoredRefreshToken(client, tokenHash);

  await enforceRefreshTokenBinding({
    existingToken,
    subjectId,
    role: decoded.role,
    token,
    ip,
    userAgent,
    executor: client,
  });

  return { tokenHash, existingToken };
}

async function issueRotatedTokens({ decoded, ip, userAgent, executor }) {
  const accessPayload = buildAccessPayload(decoded);
  return issueTokens({
    payload: accessPayload,
    role: decoded.role,
    ip,
    userAgent,
    executor,
  });
}

async function rotateRefreshTokenInTransaction({
  client,
  token,
  decoded,
  subjectId,
  ip,
  userAgent,
}) {
  const context = await prepareRotationContext({
    client,
    token,
    decoded,
    subjectId,
    ip,
    userAgent,
  });

  const { accessToken, refreshToken, refreshJti } = await issueRotatedTokens({
    decoded,
    ip,
    userAgent,
    executor: client,
  });

  await upsertRotatedTokenRecord({
    client,
    existingToken: context.existingToken,
    tokenHash: context.tokenHash,
    decoded,
    refreshJti,
    subjectId,
    ip,
    userAgent,
  });

  return { accessToken, refreshToken };
}

async function withTransaction(workFn) {
  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');
    const result = await workFn(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

async function rotateRefreshToken({ token, ip, userAgent }) {
  if (!token) {
    throw new Error('Refresh token required');
  }

  const unsafeRole = getRoleFromUnsafeRefreshToken(token);
  const roleKey = normalizeRoleKey(unsafeRole);
  const refreshSecret = getRefreshSecret(roleKey);
  if (!refreshSecret) {
    throw new Error('JWT refresh secret not configured');
  }

  const decoded = verifyRefreshTokenOrThrow(token, refreshSecret);
  const subjectId = validateDecodedRefreshToken(decoded);

  return withTransaction((client) =>
    rotateRefreshTokenInTransaction({
      client,
      token,
      decoded,
      subjectId,
      ip,
      userAgent,
    })
  );
}

module.exports = {
  issueTokens,
  rotateRefreshToken,
  revokeRefreshToken,
  revokeAllForSubject,
  cleanupExpiredTokens,
};
