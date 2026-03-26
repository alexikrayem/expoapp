// services/auditService.js
const db = require('../config/db');
const logger = require('./logger');

const AUDIT_LOG_ENABLED = process.env.AUDIT_LOG_ENABLED !== 'false';

const truncate = (value, max = 2000) => {
  if (typeof value !== 'string') return value;
  if (value.length <= max) return value;
  return value.slice(0, max);
};

const sanitizeMetadata = (metadata) => {
  if (!metadata || typeof metadata !== 'object') return null;
  const safe = {};
  Object.entries(metadata).forEach(([key, value]) => {
    if (value === undefined) return;
    if (typeof value === 'string') {
      safe[key] = truncate(value);
    } else if (typeof value === 'number' || typeof value === 'boolean') {
      safe[key] = value;
    } else {
      try {
        safe[key] = JSON.parse(JSON.stringify(value));
      } catch (error) {
        safe[key] = String(value);
      }
    }
  });
  return safe;
};

const recordAuditEvent = async ({
  req,
  action,
  actorRole,
  actorId,
  targetType,
  targetId,
  metadata,
}) => {
  if (!AUDIT_LOG_ENABLED) return;
  if (!action) return;

  const payload = {
    event_type: action,
    actor_role: actorRole || null,
    actor_id: actorId || null,
    target_type: targetType || null,
    target_id: targetId || null,
    ip: req?.ip || null,
    user_agent: req?.get?.('user-agent')?.substring(0, 255) || null,
    request_id: req?.requestId || null,
    metadata: sanitizeMetadata(metadata),
  };

  try {
    await db.query(
      `
        INSERT INTO audit_events (
          event_type, actor_role, actor_id, target_type, target_id,
          ip, user_agent, request_id, metadata
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      `,
      [
        payload.event_type,
        payload.actor_role,
        payload.actor_id,
        payload.target_type,
        payload.target_id,
        payload.ip,
        payload.user_agent,
        payload.request_id,
        payload.metadata,
      ]
    );
  } catch (error) {
    logger.warn('Failed to record audit event', { error: error.message, action });
  }
};

module.exports = {
  recordAuditEvent,
};
