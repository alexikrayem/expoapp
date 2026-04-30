const express = require("express");
const router = express.Router();
const db = require("../../config/db");
const { invalidateCache } = require("../../middleware/cache");
const { recordAuditEvent } = require("../../services/auditService");
const logger = require("../../services/logger");
const { buildDynamicUpdate } = require("../../utils/dynamicUpdate");
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
const bcrypt = require("bcrypt");
const { validatePassword } = require("../../services/passwordPolicy");
const { revokeSupplierSessions } = require("../admin.helpers");
const {
  indexSupplierById,
  reindexProductsBySupplierId,
  reindexDealsBySupplierId,
  deleteProductsBySupplierId,
  deleteDealsBySupplierId,
} = require("../../services/searchIndexer");

// Get all suppliers (admin only)
router.get("/suppliers", async (req, res) => {
  try {
    const query = `
            SELECT 
                s.id,
                s.name,
                s.email,
                s.category,
                s.location,
                s.rating,
                s.image_url,
                s.description,
                s.is_active,
                s.created_at,
                s.updated_at,
                COUNT(p.id) as product_count,
                COUNT(CASE WHEN o.status = 'pending' THEN 1 END) as pending_orders
            FROM suppliers s
            LEFT JOIN products p ON s.id = p.supplier_id AND p.is_active = true
            LEFT JOIN order_items oi ON p.id = oi.product_id
            LEFT JOIN orders o ON oi.order_id = o.id AND o.status = 'pending'
            GROUP BY s.id
            ORDER BY s.created_at DESC
            LIMIT 100
        `

    const result = await db.query(query)
    res.json({ items: result.rows })
  } catch (error) {
    logger.error("Error fetching suppliers for admin", error)
    res.status(HTTP.INTERNAL_SERVER_ERROR).json({ error: "Failed to fetch suppliers" })
  }
})

// Create new supplier (admin only)
router.post("/suppliers", validateCreateSupplier, async (req, res) => {
  try {
    const { name, email, password, category, location, rating, description, image_url, is_active = true } = req.body

    if (!name || !email || !password || !category) {
      return res.status(HTTP.BAD_REQUEST).json({ error: "Name, email, password, and category are required" })
    }

    const passwordErrors = validatePassword(password)
    if (passwordErrors.length > 0) {
      return res.status(HTTP.BAD_REQUEST).json({ error: "Password does not meet requirements", details: passwordErrors })
    }

    // Check if email already exists
    const existingQuery = "SELECT id FROM suppliers WHERE email = $1"
    const existingResult = await db.query(existingQuery, [email.toLowerCase()])

    if (existingResult.rows.length > 0) {
      return res.status(HTTP.CONFLICT).json({ error: "Email already exists" })
    }

    // Hash password
    const saltRounds = Number(process.env.BCRYPT_SALT_ROUNDS || 12)
    const passwordHash = await bcrypt.hash(password, saltRounds)

    const insertQuery = `
            INSERT INTO suppliers (
                name, email, password_hash, category, location, 
                rating, description, image_url, is_active
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            RETURNING *
        `

    const result = await db.query(insertQuery, [
      name,
      email.toLowerCase(),
      passwordHash,
      category,
      location,
      rating,
      description,
      image_url,
      is_active,
    ])

    // Remove password_hash from response
    const supplier = result.rows[0]
    delete supplier.password_hash

    if (supplier.is_active === false) {
      await revokeSupplierSessions(supplier.id)
    }

    void invalidateCache([...ADMIN_CACHE_KEYS])
    void indexSupplierById(supplier.id)
    void recordAuditEvent({
      req,
      action: "supplier_create",
      actorRole: "admin",
      actorId: req.admin?.adminId,
      targetType: "supplier",
      targetId: supplier.id,
      metadata: { email: supplier.email },
    })
    res.status(HTTP.CREATED).json(supplier)
  } catch (error) {
    logger.error("Error creating supplier", error)
    res.status(HTTP.INTERNAL_SERVER_ERROR).json({ error: "Failed to create supplier" })
  }
})

// Update supplier (admin only)
router.put("/suppliers/:id", validateUpdateSupplier, async (req, res) => {
  try {
    const { id } = req.params
    const { updateFields, updateValues, updatedFieldNames, nextParamIndex } = buildDynamicUpdate({
      payload: req.body,
      fieldMap: {
        name: {},
        email: { transform: (value) => value?.toLowerCase?.() || value },
        category: {},
        location: {},
        rating: {},
        description: {},
        image_url: {},
        is_active: {},
      },
    })

    if (updateFields.length === 0) {
      return res.status(HTTP.BAD_REQUEST).json({ error: "No fields to update" })
    }

    updateFields.push(`updated_at = NOW()`)
    updateValues.push(id)

    const updateQuery = `
            UPDATE suppliers 
            SET ${updateFields.join(", ")}
            WHERE id = $${nextParamIndex}
            RETURNING *
        `

    const result = await db.query(updateQuery, updateValues)

    if (result.rows.length === 0) {
      return res.status(HTTP.NOT_FOUND).json({ error: "Supplier not found" })
    }

    // Remove password_hash from response
    const supplier = result.rows[0]
    delete supplier.password_hash

    if (supplier.is_active === false) {
      await revokeSupplierSessions(supplier.id)
    }

    void invalidateCache([...ADMIN_CACHE_KEYS])
    void indexSupplierById(supplier.id)
    void reindexProductsBySupplierId(supplier.id)
    void reindexDealsBySupplierId(supplier.id)
    void recordAuditEvent({
      req,
      action: "supplier_update",
      actorRole: "admin",
      actorId: req.admin?.adminId,
      targetType: "supplier",
      targetId: supplier.id,
      metadata: { updated_fields: updatedFieldNames },
    })
    res.json(supplier)
  } catch (error) {
    logger.error("Error updating supplier", error)
    res.status(HTTP.INTERNAL_SERVER_ERROR).json({ error: "Failed to update supplier" })
  }
})

// Toggle supplier active status (admin only)
router.put("/suppliers/:id/toggle-active", async (req, res) => {
  try {
    const { id } = req.params

    const query = `
            UPDATE suppliers 
            SET is_active = NOT is_active, updated_at = NOW()
            WHERE id = $1
            RETURNING *
        `

    const result = await db.query(query, [id])

    if (result.rows.length === 0) {
      return res.status(HTTP.NOT_FOUND).json({ error: "Supplier not found" })
    }

    // Remove password_hash from response
    const supplier = result.rows[0]
    delete supplier.password_hash

    void invalidateCache([...ADMIN_CACHE_KEYS])
    void indexSupplierById(supplier.id)
    void reindexProductsBySupplierId(supplier.id)
    void reindexDealsBySupplierId(supplier.id)
    void recordAuditEvent({
      req,
      action: "supplier_toggle_active",
      actorRole: "admin",
      actorId: req.admin?.adminId,
      targetType: "supplier",
      targetId: supplier.id,
      metadata: { is_active: supplier.is_active },
    })
    res.json(supplier)
  } catch (error) {
    logger.error("Error toggling supplier status", error)
    res.status(HTTP.INTERNAL_SERVER_ERROR).json({ error: "Failed to toggle supplier status" })
  }
})

// Delete supplier (admin only)
router.delete("/suppliers/:id", async (req, res) => {
  try {
    const { id } = req.params

    // Check if supplier has products or orders
    const checkQuery = `
            SELECT 
                COUNT(p.id) as product_count,
                COUNT(oi.id) as order_count
            FROM suppliers s
            LEFT JOIN products p ON s.id = p.supplier_id
            LEFT JOIN order_items oi ON p.id = oi.product_id
            WHERE s.id = $1
        `

    const checkResult = await db.query(checkQuery, [id])
    const { product_count, order_count } = checkResult.rows[0]

    if (Number.parseInt(product_count) > 0 || Number.parseInt(order_count) > 0) {
      return res.status(HTTP.BAD_REQUEST).json({
        error: "Cannot delete supplier with existing products or orders. Deactivate instead.",
      })
    }

    const deleteQuery = "DELETE FROM suppliers WHERE id = $1 RETURNING id"
    const result = await db.query(deleteQuery, [id])

    if (result.rows.length === 0) {
      return res.status(HTTP.NOT_FOUND).json({ error: "Supplier not found" })
    }

    await revokeSupplierSessions(id)

    void invalidateCache([...ADMIN_CACHE_KEYS])
    void indexSupplierById(id)
    void deleteProductsBySupplierId(id)
    void deleteDealsBySupplierId(id)
    void recordAuditEvent({
      req,
      action: "supplier_delete",
      actorRole: "admin",
      actorId: req.admin?.adminId,
      targetType: "supplier",
      targetId: Number(id),
    })
    res.json({ message: "Supplier deleted successfully" })
  } catch (error) {
    logger.error("Error deleting supplier", error)
    res.status(HTTP.INTERNAL_SERVER_ERROR).json({ error: "Failed to delete supplier" })
  }
})


module.exports = router;
