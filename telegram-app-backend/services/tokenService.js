// services/tokenService.js
// Refresh token rotation + storage

const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const db = require('../config/db');

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

const issueTokens = async ({ payload, role, ip, userAgent }) => {
  const roleKey = normalizeRoleKey(role || payload.role);
  const accessSecret = getAccessSecret(roleKey);
  const refreshSecret = getRefreshSecret(roleKey);

  if (!accessSecret || !refreshSecret) {
    throw new Error('JWT secrets are not configured');
  }

  const accessToken = jwt.sign(payload, accessSecret, { expiresIn: ACCESS_TOKEN_TTL });
  const refreshJti = crypto.randomUUID();
  const refreshPayload = { ...payload, type: 'refresh', jti: refreshJti };
  const refreshToken = jwt.sign(refreshPayload, refreshSecret, { expiresIn: REFRESH_TOKEN_TTL });

  const decoded = jwt.decode(refreshToken);
  const expiresAt = decoded?.exp
    ? new Date(decoded.exp * 1000)
    : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  const subjectId = extractSubjectId(payload);
  if (!subjectId) {
    throw new Error('Token subject is missing');
  }

  await db.query(
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

const revokeAllForSubject = async (subjectId, role) => {
  if (!subjectId || !role) return;
  await db.query(
    `
      UPDATE refresh_tokens
      SET revoked_at = NOW()
      WHERE subject_id = $1 AND role = $2 AND revoked_at IS NULL
    `,
    [subjectId, normalizeRoleValue(role)]
  );
};

const revokeRefreshToken = async (token) => {
  if (!token) return;
  const tokenHash = hashToken(token);
  await db.query(
    `
      UPDATE refresh_tokens
      SET revoked_at = NOW()
      WHERE token_hash = $1 AND revoked_at IS NULL
    `,
    [tokenHash]
  );
};

const rotateRefreshToken = async ({ token, ip, userAgent }) => {
  if (!token) {
    throw new Error('Refresh token required');
  }

  const unsafeDecoded = jwt.decode(token);
  if (!unsafeDecoded || !unsafeDecoded.role) {
    throw new Error('Invalid refresh token');
  }

  const roleKey = normalizeRoleKey(unsafeDecoded.role);
  const refreshSecret = getRefreshSecret(roleKey);
  if (!refreshSecret) {
    throw new Error('JWT refresh secret not configured');
  }

  let decoded;
  try {
    decoded = jwt.verify(token, refreshSecret);
  } catch (error) {
    throw new Error('Invalid or expired refresh token');
  }

  if (decoded.type !== 'refresh') {
    throw new Error('Invalid token type');
  }

  const subjectId = extractSubjectId(decoded);
  if (!subjectId) {
    throw new Error('Token subject is missing');
  }

  const tokenHash = hashToken(token);
  const existing = await db.query(
    'SELECT token_hash, revoked_at, expires_at FROM refresh_tokens WHERE token_hash = $1',
    [tokenHash]
  );

  if (existing.rows.length > 0) {
    const row = existing.rows[0];

    if (row.revoked_at) {
      await revokeAllForSubject(subjectId, decoded.role);
      throw new Error('Refresh token reuse detected');
    }

    if (row.expires_at && new Date(row.expires_at) < new Date()) {
      await revokeRefreshToken(token);
      throw new Error('Refresh token expired');
    }
  }

  const accessPayload = buildAccessPayload(decoded);
  const { accessToken, refreshToken, refreshJti } = await issueTokens({
    payload: accessPayload,
    role: decoded.role,
    ip,
    userAgent,
  });

  const legacyJti = decoded.jti || crypto.randomUUID();
  const legacyExpiresAt = decoded.exp
    ? new Date(decoded.exp * 1000)
    : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  if (existing.rows.length > 0) {
    await db.query(
      `
        UPDATE refresh_tokens
        SET revoked_at = NOW(), replaced_by = $2, last_used_at = NOW(), ip = $3, user_agent = $4
        WHERE token_hash = $1
      `,
      [tokenHash, refreshJti, ip || null, userAgent || null]
    );
  } else {
    await db.query(
      `
        INSERT INTO refresh_tokens (
          subject_id, role, token_hash, jti, expires_at,
          revoked_at, replaced_by, created_at, last_used_at, ip, user_agent
        ) VALUES ($1, $2, $3, $4, $5, NOW(), $6, NOW(), NOW(), $7, $8)
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

  return { accessToken, refreshToken };
};

module.exports = {
  issueTokens,
  rotateRefreshToken,
  revokeRefreshToken,
};
