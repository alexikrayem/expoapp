// middleware/idempotency.js
// Enforces idempotency for critical write endpoints.

const crypto = require('crypto');
const db = require('../config/db');
const logger = require('../services/logger');

const TIME = Object.freeze({
  SECONDS_PER_MINUTE: Number.parseInt('60', 10),
  MINUTES_PER_HOUR: Number.parseInt('60', 10),
  HOURS_PER_DAY: Number.parseInt('24', 10),
  MILLISECONDS_PER_SECOND: Number.parseInt('1000', 10),
  STALE_WINDOW_MINUTES: Number.parseInt('2', 10),
});

const HTTP = Object.freeze({
  OK: Number.parseInt('200', 10),
  BAD_REQUEST: Number.parseInt('400', 10),
  UNAUTHORIZED: Number.parseInt('401', 10),
  CONFLICT: Number.parseInt('409', 10),
  INTERNAL_SERVER_ERROR: Number.parseInt('500', 10),
});

const DEFAULT_TTL_SECONDS = Number(
  process.env.IDEMPOTENCY_TTL_SECONDS
  || TIME.SECONDS_PER_MINUTE * TIME.MINUTES_PER_HOUR * TIME.HOURS_PER_DAY
); // 24h
const DEFAULT_STALE_MS = Number(
  process.env.IDEMPOTENCY_STALE_MS
  || TIME.STALE_WINDOW_MINUTES * TIME.SECONDS_PER_MINUTE * TIME.MILLISECONDS_PER_SECOND
); // 2 minutes

const stableStringify = function (value) {
  if (value === null || value === undefined) return 'null';
  if (typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(',')}]`;
  }
  const keys = Object.keys(value).sort();
  const entries = keys.map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`);
  return `{${entries.join(',')}}`;
};

const hashRequest = function (req) {
  const payload = `${req.method}|${req.originalUrl}|${stableStringify(req.body || {})}`;
  return crypto.createHash('sha256').update(payload).digest('hex');
};

const getActorUserId = function (req) {
  if (req?.user?.userId) return Number(req.user.userId);
  return null;
};

const normalizeBodyForStorage = function (body) {
  if (body === undefined) return null;
  if (Buffer.isBuffer(body)) {
    return { encoding: 'base64', data: body.toString('base64') };
  }
  return body;
};

const idempotency = function ({ scope, requireKey = false, ttlSeconds = DEFAULT_TTL_SECONDS } = {}) {
  if (!scope) {
    throw new Error('Idempotency middleware requires a scope');
  }

  return async (req, res, next) => {
    const rawKey = req.get('Idempotency-Key') || req.get('idempotency-key');
    const key = rawKey ? String(rawKey).trim().substring(0, 255) : undefined;
    
    if (!key) {
      if (requireKey) {
        return res.status(HTTP.BAD_REQUEST).json({ error: 'Idempotency-Key header is required' });
      }
      return next();
    }

    const userId = getActorUserId(req);
    if (!userId) {
      return res.status(HTTP.UNAUTHORIZED).json({ error: 'Authenticated user required for idempotent requests' });
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

        const rearmInProgress = async function (recordId) {
          await db.query(
            `
            UPDATE idempotency_keys
            SET status = 'in_progress',
                response_status = NULL,
                response_body = NULL,
                completed_at = NULL,
                updated_at = NOW(),
                expires_at = NOW() + ($1 || ' seconds')::interval
            WHERE id = $2
            `,
            [ttlSeconds, recordId]
          );
          req.idempotencyKeyId = recordId;
        };

        if (existing.request_hash !== requestHash) {
          return res.status(HTTP.CONFLICT).json({ error: 'Idempotency-Key reuse with different request payload' });
        }

        if (existing.status === 'completed') {
          res.set('Idempotency-Replay', 'true');
          if (existing.response_status) {
            res.status(existing.response_status);
          }
          return res.json(existing.response_body ?? null);
        }

        if (existing.status === 'failed') {
          await rearmInProgress(existing.id);
        } else if (!isStale) {
          return res.status(HTTP.CONFLICT).json({ error: 'Request is already in progress' });
        } else {
          await rearmInProgress(existing.id);
        }
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
      return res.status(HTTP.INTERNAL_SERVER_ERROR).json({ error: 'Failed to process idempotent request' });
    }

    const idempotencyKeyId = req.idempotencyKeyId;
    if (!idempotencyKeyId) {
      return next();
    }

    let finalized = false;
    const finalize = async function (body) {
      if (finalized) return;
      finalized = true;

      const responseStatus = Number(res.statusCode) || HTTP.OK;

      try {
        if (responseStatus >= HTTP.INTERNAL_SERVER_ERROR) {
          await db.query(
            `
            UPDATE idempotency_keys
            SET status = 'failed',
                response_status = NULL,
                response_body = NULL,
                updated_at = NOW(),
                completed_at = NULL
            WHERE id = $1
            `,
            [idempotencyKeyId]
          );
          return;
        }

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
          [responseStatus, normalizeBodyForStorage(body), idempotencyKeyId]
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
