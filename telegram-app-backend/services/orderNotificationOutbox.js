const db = require('../config/db');
const logger = require('./logger');
const telegramBotService = require('./telegramBot');
const { enqueueOrderNotification } = require('./notificationQueue');

const OUTBOX_STATUS = Object.freeze({
  PENDING: 'pending',
  SENT: 'sent',
});

const buildRetryDelayMinutes = (attempts) => {
  const safeAttempts = Number.isFinite(Number(attempts)) ? Number(attempts) : 0;
  return Math.min(2 ** Math.min(safeAttempts, 5), 30);
};

const enqueuePendingOrderNotifications = async (client, notifications) => {
  if (!client || !Array.isArray(notifications) || notifications.length === 0) {
    return 0;
  }

  try {
    let insertedCount = 0;
    for (const notification of notifications) {
      const orderId = Number(notification?.orderId);
      const supplierId = Number(notification?.supplierId);
      if (!Number.isInteger(orderId) || !Number.isInteger(supplierId)) {
        continue;
      }

      await client.query(
        `
          INSERT INTO pending_notifications (
            notification_type,
            order_id,
            supplier_id,
            payload,
            status,
            attempts,
            available_at
          )
          VALUES ($1, $2, $3, $4::jsonb, $5, 0, NOW())
        `,
        [
          'order-notification',
          orderId,
          supplierId,
          JSON.stringify(notification),
          OUTBOX_STATUS.PENDING,
        ]
      );
      insertedCount += 1;
    }

    return insertedCount;
  } catch (error) {
    logger.warn('Unable to enqueue pending order notifications in outbox, falling back to immediate dispatch', {
      error: error?.message || String(error),
    });
    return 0;
  }
};

const getPendingNotifications = async (client, { orderId, limit }) => {
  const safeLimit = Number.isFinite(Number(limit)) && Number(limit) > 0
    ? Math.min(Number(limit), 100)
    : 25;

  if (orderId) {
    return client.query(
      `
        SELECT id, payload, attempts
        FROM pending_notifications
        WHERE status = $1
          AND order_id = $2
          AND available_at <= NOW()
        ORDER BY created_at ASC
        LIMIT $3
        FOR UPDATE SKIP LOCKED
      `,
      [OUTBOX_STATUS.PENDING, Number(orderId), safeLimit]
    );
  }

  return client.query(
    `
      SELECT id, payload, attempts
      FROM pending_notifications
      WHERE status = $1
        AND available_at <= NOW()
      ORDER BY created_at ASC
      LIMIT $2
      FOR UPDATE SKIP LOCKED
    `,
    [OUTBOX_STATUS.PENDING, safeLimit]
  );
};

const markNotificationSent = async (client, pendingNotificationId) => {
  await client.query(
    `
      UPDATE pending_notifications
      SET status = $2,
          sent_at = NOW(),
          last_error = NULL,
          updated_at = NOW()
      WHERE id = $1
    `,
    [pendingNotificationId, OUTBOX_STATUS.SENT]
  );
};

const markNotificationRetry = async (
  client,
  { pendingNotificationId, attempts, error }
) => {
  const retryDelayMinutes = buildRetryDelayMinutes(attempts);

  await client.query(
    `
      UPDATE pending_notifications
      SET attempts = attempts + 1,
          last_error = $2,
          available_at = NOW() + ($3::text || ' minutes')::interval,
          updated_at = NOW()
      WHERE id = $1
    `,
    [pendingNotificationId, String(error?.message || error), String(retryDelayMinutes)]
  );

  return retryDelayMinutes;
};

const deliverNotification = async (payload) => {
  const queued = await enqueueOrderNotification(payload);
  if (!queued) {
    await telegramBotService.sendOrderNotificationToDeliveryAgent(payload);
  }
};

const processPendingNotification = async (client, row) => {
  const pendingNotificationId = row.id;
  const payload = row?.payload || {};
  const attempts = Number(row?.attempts || 0);

  try {
    await deliverNotification(payload);
    await markNotificationSent(client, pendingNotificationId);
    return { sent: 1, failed: 0 };
  } catch (error) {
    const retryDelayMinutes = await markNotificationRetry(client, {
      pendingNotificationId,
      attempts,
      error,
    });
    logger.error('Pending order notification dispatch failed', error, {
      pendingNotificationId,
      retryDelayMinutes,
    });
    return { sent: 0, failed: 1 };
  }
};

const dispatchPendingNotifications = async ({ orderId = null, limit = 25 } = {}) => {
  const client = await db.pool.connect();
  let sent = 0;
  let failed = 0;

  try {
    await client.query('BEGIN');
    const pendingResult = await getPendingNotifications(client, { orderId, limit });

    for (const row of pendingResult.rows) {
      const result = await processPendingNotification(client, row);
      sent += result.sent;
      failed += result.failed;
    }

    await client.query('COMMIT');
    return {
      processed: pendingResult.rows.length,
      sent,
      failed,
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

const dispatchPendingNotificationsForOrder = async (orderId) =>
  dispatchPendingNotifications({ orderId, limit: 50 });

module.exports = {
  enqueuePendingOrderNotifications,
  dispatchPendingNotifications,
  dispatchPendingNotificationsForOrder,
};
