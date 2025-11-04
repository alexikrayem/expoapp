// routes/admin.js
const express = require("express")
const router = express.Router()
const db = require("../config/db")
const authAdmin = require("../middleware/authAdmin")
const bcrypt = require("bcrypt")
const telegramBotService = require("../services/telegramBot")

// Get all suppliers (admin only)
router.get("/suppliers", authAdmin, async (req, res) => {
  try {
    const query = `
            SELECT 
                s.*,
                COUNT(p.id) as product_count,
                COUNT(CASE WHEN o.status = 'pending' THEN 1 END) as pending_orders
            FROM suppliers s
            LEFT JOIN products p ON s.id = p.supplier_id AND p.is_active = true
            LEFT JOIN order_items oi ON p.id = oi.product_id
            LEFT JOIN orders o ON oi.order_id = o.id AND o.status = 'pending'
            GROUP BY s.id
            ORDER BY s.created_at DESC
        `

    const result = await db.query(query)
    res.json({ items: result.rows })
  } catch (error) {
    console.error("Error fetching suppliers for admin:", error)
    res.status(500).json({ error: "Failed to fetch suppliers" })
  }
})

// Create new supplier (admin only)
router.post("/suppliers", authAdmin, async (req, res) => {
  try {
    const { name, email, password, category, location, rating, description, image_url, is_active = true } = req.body

    if (!name || !email || !password || !category) {
      return res.status(400).json({ error: "Name, email, password, and category are required" })
    }

    // Check if email already exists
    const existingQuery = "SELECT id FROM suppliers WHERE email = $1"
    const existingResult = await db.query(existingQuery, [email.toLowerCase()])

    if (existingResult.rows.length > 0) {
      return res.status(409).json({ error: "Email already exists" })
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10)

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

    res.status(201).json(supplier)
  } catch (error) {
    console.error("Error creating supplier:", error)
    res.status(500).json({ error: "Failed to create supplier" })
  }
})

// Update supplier (admin only)
router.put("/suppliers/:id", authAdmin, async (req, res) => {
  try {
    const { id } = req.params
    const { name, email, category, location, rating, description, image_url, is_active } = req.body

    const updateFields = []
    const updateValues = []
    let paramIndex = 1

    if (name !== undefined) {
      updateFields.push(`name = $${paramIndex}`)
      updateValues.push(name)
      paramIndex++
    }

    if (email !== undefined) {
      updateFields.push(`email = $${paramIndex}`)
      updateValues.push(email.toLowerCase())
      paramIndex++
    }

    if (category !== undefined) {
      updateFields.push(`category = $${paramIndex}`)
      updateValues.push(category)
      paramIndex++
    }

    if (location !== undefined) {
      updateFields.push(`location = $${paramIndex}`)
      updateValues.push(location)
      paramIndex++
    }

    if (rating !== undefined) {
      updateFields.push(`rating = $${paramIndex}`)
      updateValues.push(rating)
      paramIndex++
    }

    if (description !== undefined) {
      updateFields.push(`description = $${paramIndex}`)
      updateValues.push(description)
      paramIndex++
    }

    if (image_url !== undefined) {
      updateFields.push(`image_url = $${paramIndex}`)
      updateValues.push(image_url)
      paramIndex++
    }

    if (is_active !== undefined) {
      updateFields.push(`is_active = $${paramIndex}`)
      updateValues.push(is_active)
      paramIndex++
    }

    if (updateFields.length === 0) {
      return res.status(400).json({ error: "No fields to update" })
    }

    updateFields.push(`updated_at = NOW()`)
    updateValues.push(id)

    const updateQuery = `
            UPDATE suppliers 
            SET ${updateFields.join(", ")}
            WHERE id = $${paramIndex}
            RETURNING *
        `

    const result = await db.query(updateQuery, updateValues)

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Supplier not found" })
    }

    // Remove password_hash from response
    const supplier = result.rows[0]
    delete supplier.password_hash

    res.json(supplier)
  } catch (error) {
    console.error("Error updating supplier:", error)
    res.status(500).json({ error: "Failed to update supplier" })
  }
})

// Toggle supplier active status (admin only)
router.put("/suppliers/:id/toggle-active", authAdmin, async (req, res) => {
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
      return res.status(404).json({ error: "Supplier not found" })
    }

    // Remove password_hash from response
    const supplier = result.rows[0]
    delete supplier.password_hash

    res.json(supplier)
  } catch (error) {
    console.error("Error toggling supplier status:", error)
    res.status(500).json({ error: "Failed to toggle supplier status" })
  }
})

// Delete supplier (admin only)
router.delete("/suppliers/:id", authAdmin, async (req, res) => {
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
      return res.status(400).json({
        error: "Cannot delete supplier with existing products or orders. Deactivate instead.",
      })
    }

    const deleteQuery = "DELETE FROM suppliers WHERE id = $1 RETURNING id"
    const result = await db.query(deleteQuery, [id])

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Supplier not found" })
    }

    res.json({ message: "Supplier deleted successfully" })
  } catch (error) {
    console.error("Error deleting supplier:", error)
    res.status(500).json({ error: "Failed to delete supplier" })
  }
})

// Get featured items definitions (admin only)
router.get("/featured-items-definitions", authAdmin, async (req, res) => {
  try {
    const query = `
            SELECT 
                fd.*,
                CASE 
                    WHEN fd.item_type = 'product' THEN p.name
                    WHEN fd.item_type = 'deal' THEN d.title
                    WHEN fd.item_type = 'supplier' THEN s.name
                END as original_item_name
            FROM featured_items fd
            LEFT JOIN products p ON fd.item_type = 'product' AND fd.item_id = p.id
            LEFT JOIN deals d ON fd.item_type = 'deal' AND fd.item_id = d.id
            LEFT JOIN suppliers s ON fd.item_type = 'supplier' AND fd.item_id = s.id
            ORDER BY fd.display_order ASC, fd.created_at DESC
        `

    const result = await db.query(query)
    res.json({ items: result.rows })
  } catch (error) {
    console.error("Error fetching featured items definitions:", error)
    res.status(500).json({ error: "Failed to fetch featured items definitions" })
  }
})

// Create featured item (admin only)
router.post("/featured-items", authAdmin, async (req, res) => {
  try {
    const {
      item_type,
      item_id,
      display_order = 0,
      custom_title,
      custom_description,
      custom_image_url,
      is_active = true,
      active_from,
      active_until,
    } = req.body

    if (!item_type || !item_id) {
      return res.status(400).json({ error: "Item type and item ID are required" })
    }

    const insertQuery = `
            INSERT INTO featured_items (
                item_type, item_id, display_order, custom_title,
                custom_description, custom_image_url, is_active,
                active_from, active_until
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            RETURNING *
        `

    const result = await db.query(insertQuery, [
      item_type,
      item_id,
      display_order,
      custom_title,
      custom_description,
      custom_image_url,
      is_active,
      active_from,
      active_until,
    ])

    res.status(201).json(result.rows[0])
  } catch (error) {
    console.error("Error creating featured item:", error)
    res.status(500).json({ error: "Failed to create featured item" })
  }
})

// Update featured item (admin only)
router.put("/featured-items-definitions/:id", authAdmin, async (req, res) => {
  try {
    const { id } = req.params
    const {
      item_type,
      item_id,
      display_order,
      custom_title,
      custom_description,
      custom_image_url,
      is_active,
      active_from,
      active_until,
    } = req.body

    const updateFields = []
    const updateValues = []
    let paramIndex = 1

    if (item_type !== undefined) {
      updateFields.push(`item_type = $${paramIndex}`)
      updateValues.push(item_type)
      paramIndex++
    }

    if (item_id !== undefined) {
      updateFields.push(`item_id = $${paramIndex}`)
      updateValues.push(item_id)
      paramIndex++
    }

    if (display_order !== undefined) {
      updateFields.push(`display_order = $${paramIndex}`)
      updateValues.push(display_order)
      paramIndex++
    }

    if (custom_title !== undefined) {
      updateFields.push(`custom_title = $${paramIndex}`)
      updateValues.push(custom_title)
      paramIndex++
    }

    if (custom_description !== undefined) {
      updateFields.push(`custom_description = $${paramIndex}`)
      updateValues.push(custom_description)
      paramIndex++
    }

    if (custom_image_url !== undefined) {
      updateFields.push(`custom_image_url = $${paramIndex}`)
      updateValues.push(custom_image_url)
      paramIndex++
    }

    if (is_active !== undefined) {
      updateFields.push(`is_active = $${paramIndex}`)
      updateValues.push(is_active)
      paramIndex++
    }

    if (active_from !== undefined) {
      updateFields.push(`active_from = $${paramIndex}`)
      updateValues.push(active_from)
      paramIndex++
    }

    if (active_until !== undefined) {
      updateFields.push(`active_until = $${paramIndex}`)
      updateValues.push(active_until)
      paramIndex++
    }

    if (updateFields.length === 0) {
      return res.status(400).json({ error: "No fields to update" })
    }

    updateFields.push(`updated_at = NOW()`)
    updateValues.push(id)

    const updateQuery = `
            UPDATE featured_items 
            SET ${updateFields.join(", ")}
            WHERE id = $${paramIndex}
            RETURNING *
        `

    const result = await db.query(updateQuery, updateValues)

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Featured item not found" })
    }

    res.json(result.rows[0])
  } catch (error) {
    console.error("Error updating featured item:", error)
    res.status(500).json({ error: "Failed to update featured item" })
  }
})

// Delete featured item (admin only)
router.delete("/featured-items-definitions/:id", authAdmin, async (req, res) => {
  try {
    const { id } = req.params

    const deleteQuery = "DELETE FROM featured_items WHERE id = $1 RETURNING id"
    const result = await db.query(deleteQuery, [id])

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Featured item not found" })
    }

    res.json({ message: "Featured item deleted successfully" })
  } catch (error) {
    console.error("Error deleting featured item:", error)
    res.status(500).json({ error: "Failed to delete featured item" })
  }
})

// Send broadcast message (admin only)
router.post("/broadcast", authAdmin, async (req, res) => {
  try {
    const { message } = req.body

    if (!message || !message.trim()) {
      return res.status(400).json({ error: "Message content is required" })
    }

    const result = await telegramBotService.broadcastToAllUsers(message.trim(), req.admin.adminId)

    res.json({
      message: "Broadcast sent successfully",
      successCount: result.successCount,
      failCount: result.failCount,
    })
  } catch (error) {
    console.error("Error sending broadcast:", error)
    res.status(500).json({ error: "Failed to send broadcast message" })
  }
})

// Get platform statistics (admin only)
router.get("/stats", authAdmin, async (req, res) => {
  try {
    const stats = await telegramBotService.getPlatformStats()
    res.json(stats)
  } catch (error) {
    console.error("Error fetching platform stats:", error)
    res.status(500).json({ error: "Failed to fetch platform statistics" })
  }
})

// Get all featured lists (admin only)
router.get("/featured-lists", authAdmin, async (req, res) => {
  try {
    const query = `
            SELECT 
                fl.id,
                fl.list_name,
                fl.list_type,
                fl.description,
                fl.custom_image_url,
                fl.is_active,
                fl.display_order,
                fl.created_at,
                fl.updated_at,
                COUNT(fli.id) as item_count
            FROM featured_lists fl
            LEFT JOIN featured_list_items fli ON fl.id = fli.featured_list_id
            GROUP BY fl.id
            ORDER BY fl.display_order ASC, fl.created_at DESC
        `

    const result = await db.query(query)
    res.json({ items: result.rows })
  } catch (error) {
    console.error("Error fetching featured lists:", error)
    res.status(500).json({ error: "Failed to fetch featured lists" })
  }
})

// Get featured list with all its items (admin only)
router.get("/featured-lists/:id", authAdmin, async (req, res) => {
  try {
    const { id } = req.params

    // Get list details
    const listQuery = `
            SELECT 
                fl.id,
                fl.list_name,
                fl.list_type,
                fl.description,
                fl.custom_image_url,
                fl.is_active,
                fl.display_order
            FROM featured_lists fl
            WHERE fl.id = $1
        `

    const listResult = await db.query(listQuery, [id])

    if (listResult.rows.length === 0) {
      return res.status(404).json({ error: "Featured list not found" })
    }

    const list = listResult.rows[0]

    // Get items in this list
    const itemsQuery = `
            SELECT 
                fli.id as list_item_id,
                fli.item_type,
                fli.item_id,
                fli.display_order,
                CASE 
                    WHEN fli.item_type = 'product' THEN p.name
                    WHEN fli.item_type = 'deal' THEN d.title
                END as item_name,
                CASE 
                    WHEN fli.item_type = 'product' THEN p.image_url
                    WHEN fli.item_type = 'deal' THEN d.image_url
                END as item_image_url
            FROM featured_list_items fli
            LEFT JOIN products p ON fli.item_type = 'product' AND fli.item_id = p.id
            LEFT JOIN deals d ON fli.item_type = 'deal' AND fli.item_id = d.id
            WHERE fli.featured_list_id = $1
            ORDER BY fli.display_order ASC
        `

    const itemsResult = await db.query(itemsQuery, [id])

    res.json({
      list,
      items: itemsResult.rows,
    })
  } catch (error) {
    console.error("Error fetching featured list:", error)
    res.status(500).json({ error: "Failed to fetch featured list" })
  }
})

// Create featured list (admin only)
router.post("/featured-lists", authAdmin, async (req, res) => {
  try {
    const {
      list_name,
      list_type,
      description,
      custom_image_url,
      is_active = true,
      display_order = 0,
      items = [], // Array of { item_type, item_id }
    } = req.body

    if (!list_name || !list_type) {
      return res.status(400).json({ error: "List name and type are required" })
    }

    if (!["products", "deals"].includes(list_type)) {
      return res.status(400).json({ error: 'List type must be "products" or "deals"' })
    }

    // Create the list
    const insertListQuery = `
            INSERT INTO featured_lists (
                list_name, list_type, description, custom_image_url, 
                is_active, display_order, created_by
            ) VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING id
        `

    const listResult = await db.query(insertListQuery, [
      list_name,
      list_type,
      description,
      custom_image_url,
      is_active,
      display_order,
      req.admin.adminId,
    ])

    const listId = listResult.rows[0].id

    // Add items to the list if provided
    if (items && items.length > 0) {
      for (let i = 0; i < items.length; i++) {
        const { item_type, item_id } = items[i]

        if (!item_type || !item_id) continue

        const insertItemQuery = `
                    INSERT INTO featured_list_items (
                        featured_list_id, item_type, item_id, display_order
                    ) VALUES ($1, $2, $3, $4)
                    ON CONFLICT DO NOTHING
                `

        await db.query(insertItemQuery, [listId, item_type, item_id, i])
      }
    }

    res.status(201).json({
      id: listId,
      message: "Featured list created successfully",
    })
  } catch (error) {
    console.error("Error creating featured list:", error)
    res.status(500).json({ error: "Failed to create featured list" })
  }
})

// Update featured list (admin only)
router.put("/featured-lists/:id", authAdmin, async (req, res) => {
  try {
    const { id } = req.params
    const {
      list_name,
      description,
      custom_image_url,
      is_active,
      display_order,
      items, // Array of { item_type, item_id }
    } = req.body

    const updateFields = []
    const updateValues = []
    let paramIndex = 1

    if (list_name !== undefined) {
      updateFields.push(`list_name = $${paramIndex}`)
      updateValues.push(list_name)
      paramIndex++
    }

    if (description !== undefined) {
      updateFields.push(`description = $${paramIndex}`)
      updateValues.push(description)
      paramIndex++
    }

    if (custom_image_url !== undefined) {
      updateFields.push(`custom_image_url = $${paramIndex}`)
      updateValues.push(custom_image_url)
      paramIndex++
    }

    if (is_active !== undefined) {
      updateFields.push(`is_active = $${paramIndex}`)
      updateValues.push(is_active)
      paramIndex++
    }

    if (display_order !== undefined) {
      updateFields.push(`display_order = $${paramIndex}`)
      updateValues.push(display_order)
      paramIndex++
    }

    if (updateFields.length === 0 && (!items || items.length === 0)) {
      return res.status(400).json({ error: "No fields to update" })
    }

    // Update list metadata if there are changes
    if (updateFields.length > 0) {
      updateFields.push(`updated_at = NOW()`)
      updateValues.push(id)

      const updateQuery = `
                UPDATE featured_lists 
                SET ${updateFields.join(", ")}
                WHERE id = $${paramIndex}
            `

      await db.query(updateQuery, updateValues)
    }

    // If items provided, replace the list items
    if (items && items.length > 0) {
      // Delete existing items
      await db.query("DELETE FROM featured_list_items WHERE featured_list_id = $1", [id])

      // Add new items
      for (let i = 0; i < items.length; i++) {
        const { item_type, item_id } = items[i]

        if (!item_type || !item_id) continue

        const insertItemQuery = `
                    INSERT INTO featured_list_items (
                        featured_list_id, item_type, item_id, display_order
                    ) VALUES ($1, $2, $3, $4)
                    ON CONFLICT DO NOTHING
                `

        await db.query(insertItemQuery, [id, item_type, item_id, i])
      }
    }

    res.json({ message: "Featured list updated successfully" })
  } catch (error) {
    console.error("Error updating featured list:", error)
    res.status(500).json({ error: "Failed to update featured list" })
  }
})

// Delete featured list (admin only)
router.delete("/featured-lists/:id", authAdmin, async (req, res) => {
  try {
    const { id } = req.params

    const deleteQuery = "DELETE FROM featured_lists WHERE id = $1 RETURNING id"
    const result = await db.query(deleteQuery, [id])

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Featured list not found" })
    }

    res.json({ message: "Featured list deleted successfully" })
  } catch (error) {
    console.error("Error deleting featured list:", error)
    res.status(500).json({ error: "Failed to delete featured list" })
  }
})

// Add items to featured list (admin only)
router.post("/featured-lists/:id/items", authAdmin, async (req, res) => {
  try {
    const { id } = req.params
    const { item_type, item_id, display_order = 0 } = req.body

    if (!item_type || !item_id) {
      return res.status(400).json({ error: "Item type and ID are required" })
    }

    const insertQuery = `
            INSERT INTO featured_list_items (
                featured_list_id, item_type, item_id, display_order
            ) VALUES ($1, $2, $3, $4)
            ON CONFLICT (featured_list_id, item_type, item_id) 
            DO UPDATE SET display_order = $4
            RETURNING *
        `

    const result = await db.query(insertQuery, [id, item_type, item_id, display_order])
    res.status(201).json(result.rows[0])
  } catch (error) {
    console.error("Error adding item to list:", error)
    res.status(500).json({ error: "Failed to add item to list" })
  }
})

// Remove item from featured list (admin only)
router.delete("/featured-lists/:id/items/:itemId", authAdmin, async (req, res) => {
  try {
    const { id, itemId } = req.params

    const deleteQuery = `
            DELETE FROM featured_list_items 
            WHERE featured_list_id = $1 AND id = $2
            RETURNING id
        `

    const result = await db.query(deleteQuery, [id, itemId])

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "List item not found" })
    }

    res.json({ message: "Item removed from list" })
  } catch (error) {
    console.error("Error removing item from list:", error)
    res.status(500).json({ error: "Failed to remove item from list" })
  }
})

module.exports = router
