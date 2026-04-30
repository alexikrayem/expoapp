const express = require("express");
const router = express.Router();
const db = require("../../config/db");
const logger = require("../../services/logger");
const { invalidateCache } = require("../../middleware/cache");
const { recordAuditEvent } = require("../../services/auditService");
const {
  validateCreateSupplier,
  validateUpdateSupplier,
  validateCreateFeaturedItem,
  validateUpdateFeaturedItem,
  validateCreateFeaturedList,
  validateBroadcast,
  HTTP,
  ADMIN_CACHE_KEYS,
  FEATURED_CACHE_KEYS,
  FEATURED_LIST_CACHE_KEYS
} = require("./adminUtils");
const telegramBotService = require("../../services/telegramBot");
const { getQueueStats } = require("../../services/queueMonitor");

// Send broadcast message (admin only)
router.post("/broadcast", validateBroadcast, async (req, res) => {
  try {
    const { message } = req.body

    if (!message || !message.trim()) {
      return res.status(HTTP.BAD_REQUEST).json({ error: "Message content is required" })
    }

    const result = await telegramBotService.broadcastToAllUsers(message.trim(), req.admin.adminId)

    void recordAuditEvent({
      req,
      action: "broadcast_send",
      actorRole: "admin",
      actorId: req.admin?.adminId,
      targetType: "broadcast",
      targetId: null,
      metadata: {
        message_length: message.trim().length,
        successCount: result.successCount,
        failCount: result.failCount,
      },
    })
    res.json({
      message: "Broadcast sent successfully",
      successCount: result.successCount,
      failCount: result.failCount,
    })
  } catch (error) {
    logger.error("Error sending broadcast", error)
    res.status(HTTP.INTERNAL_SERVER_ERROR).json({ error: "Failed to send broadcast message" })
  }
})

// Get platform statistics (admin only)
router.get("/stats", async (req, res) => {
  try {
    const stats = await telegramBotService.getPlatformStats()
    res.json(stats)
  } catch (error) {
    logger.error("Error fetching platform stats", error)
    res.status(HTTP.INTERNAL_SERVER_ERROR).json({ error: "Failed to fetch platform statistics" })
  }
})

// Queue stats (admin only)
router.get("/queue-stats", async (req, res) => {
  try {
    const stats = await getQueueStats()
    res.json(stats)
  } catch (error) {
    logger.error("Error fetching queue stats", error)
    res.status(HTTP.INTERNAL_SERVER_ERROR).json({ error: "Failed to fetch queue stats" })
  }
})


module.exports = router;
