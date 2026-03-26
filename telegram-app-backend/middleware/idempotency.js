// middleware/idempotency.js
// Enforces idempotency for critical write endpoints.

const crypto = require('crypto');
const db = require('../config/db');
const logger = require('../services/logger');

const DEFAULT_TTL_SECONDS = Number(process.env.IDEMPOTENCY_TTL_SECONDS || 60 * 60 * 24); // 24h
const DEFAULT_STALE_MS = Number(process.env.IDEMPOTENCY_STALE_MS || 2 * 60 * 1000); // 2 minutes

const stableStringify = (value) => {
  if (value === null || value === undefined) return 'null';
  if (typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(',')}]`;
  }
  const keys = Object.keys(value).sort();
  const entries = keys.map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`);
  return `{${entries.join(',')}}`;
};

const hashRequest = (req) => {
  const payload = `${req.method}|${req.originalUrl}|${stableStringify(req.body || {})}`;
  return crypto.createHash('sha256').update(payload).digest('hex');
};

const getActorUserId = (req) => {
  if (req?.user?.userId) return Number(req.user.userId);
  return null;
};

const normalizeBodyForStorage = (body) => {
  if (body === undefined) return null;
  if (Buffer.isBuffer(body)) {
    return { encoding: 'base64', data: body.toString('base64') };
  }
  return body;
};

const idempotency = ({ scope, requireKey = false, ttlSeconds = DEFAULT_TTL_SECONDS } = {}) => {
  if (!scope) {
    throw new Error('Idempotency middleware requires a scope');
  }

  return async (req, res, next) => {
    const key = req.get('Idempotency-Key') || req.get('idempotency-key');
    if (!key) {
      if (requireKey) {
        return res.status(400).json({ error: 'Idempotency-Key header is required' });
      }
      return next();
    }

    const userId = getActorUserId(req);
    if (!userId) {
      return res.status(401).json({ error: 'Authenticated user required for idempotent requests' });
    }

    const requestHash = hashRequest(req);
    const now = Date.now();

    try {
      const existingResult = await db.query(
        `
        SELECT *
        FROM idempotency_keys
        WHERE user_id = $1 AND scope = $2 AND idempotency_key = $3 AND expires_at > NOW()
        ORDER BY id DESC
        LIMIT 1
        `,
        [userId, scope, key]
      );

      if (existingResult.rows.length > 0) {
        const existing = existingResult.rows[0];
        const createdAt = new Date(existing.created_at).getTime();
        const isStale = existing.status === 'in_progress' && Number.isFinite(createdAt)
          ? now - createdAt > DEFAULT_STALE_MS
          : false;

        if (existing.request_hash !== requestHash) {
          return res.status(409).json({ error: 'Idempotency-Key reuse with different request payload' });
        }

        if (existing.status === 'completed') {
          res.set('Idempotency-Replay', 'true');
          if (existing.response_status) {
            res.status(existing.response_status);
          }
          return res.json(existing.response_body ?? null);
        }

        if (!isStale) {
          return res.status(409).json({ error: 'Request is already in progress' });
        }

        await db.query(
          `
          UPDATE idempotency_keys
          SET status = 'in_progress', updated_at = NOW(), expires_at = NOW() + ($1 || ' seconds')::interval
          WHERE id = $2
          `,
          [ttlSeconds, existing.id]
        );

        req.idempotencyKeyId = existing.id;
      } else {
        await db.query(
          `
          DELETE FROM idempotency_keys
          WHERE user_id = $1 AND scope = $2 AND idempotency_key = $3 AND expires_at <= NOW()
          `,
          [userId, scope, key]
        );

        const insertResult = await db.query(
          `
          INSERT INTO idempotency_keys (user_id, scope, idempotency_key, request_hash, status, expires_at)
          VALUES ($1, $2, $3, $4, 'in_progress', NOW() + ($5 || ' seconds')::interval)
          RETURNING id
          `,
          [userId, scope, key, requestHash, ttlSeconds]
        );
        req.idempotencyKeyId = insertResult.rows[0]?.id;
      }
    } catch (error) {
      logger.warn('Idempotency lookup failed', { error: error.message });
      return res.status(500).json({ error: 'Failed to process idempotent request' });
    }

    const idempotencyKeyId = req.idempotencyKeyId;
    if (!idempotencyKeyId) {
      return next();
    }

    const finalize = async (body) => {
      try {
        await db.query(
          `
          UPDATE idempotency_keys
          SET status = 'completed',
              response_status = $1,
              response_body = $2,
              updated_at = NOW(),
              completed_at = NOW()
          WHERE id = $3
          `,
          [res.statusCode || 200, normalizeBodyForStorage(body), idempotencyKeyId]
        );
      } catch (error) {
        logger.warn('Idempotency finalize failed', { error: error.message });
      }
    };

    const originalJson = res.json.bind(res);
    res.json = (body) => {
      void finalize(body);
      return originalJson(body);
    };

    const originalSend = res.send.bind(res);
    res.send = (body) => {
      void finalize(body);
      return originalSend(body);
    };

    return next();
  };
};

module.exports = { idempotency };
