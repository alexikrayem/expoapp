// routes/featuredItems.js
const express = require("express")
const router = express.Router()
const db = require("../config/db")

// Get featured items for the slider
router.get("/", async (req, res) => {
  try {
    const query = `
            SELECT 
                fi.id as feature_id,
                fi.item_type,
                fi.item_id,
                fi.display_order,
                fi.custom_title,
                fi.custom_description,
                fi.custom_image_url,
                fi.is_active,
                fi.active_from,
                fi.active_until,
                CASE 
                    WHEN fi.item_type = 'product' THEN p.name
                    WHEN fi.item_type = 'deal' THEN d.title
                    WHEN fi.item_type = 'supplier' THEN s.name
                    WHEN fi.item_type = 'list' THEN fl.list_name
                END as original_item_name,
                CASE 
                    WHEN fi.item_type = 'product' THEN p.description
                    WHEN fi.item_type = 'deal' THEN d.description
                    WHEN fi.item_type = 'supplier' THEN s.description
                    WHEN fi.item_type = 'list' THEN fl.description
                END as original_item_description,
                CASE 
                    WHEN fi.item_type = 'product' THEN p.image_url
                    WHEN fi.item_type = 'deal' THEN d.image_url
                    WHEN fi.item_type = 'supplier' THEN s.image_url
                    WHEN fi.item_type = 'list' THEN fl.custom_image_url
                END as original_item_image_url,
                CASE 
                    WHEN fi.item_type = 'list' THEN fl.list_type
                END as list_type
            FROM featured_items fi
            LEFT JOIN products p ON fi.item_type = 'product' AND fi.item_id = p.id
            LEFT JOIN deals d ON fi.item_type = 'deal' AND fi.item_id = d.id
            LEFT JOIN suppliers s ON fi.item_type = 'supplier' AND fi.item_id = s.id
            LEFT JOIN featured_lists fl ON fi.item_type = 'list' AND fi.item_id = fl.id
            WHERE fi.is_active = true
            AND (fi.active_from IS NULL OR fi.active_from <= NOW())
            AND (fi.active_until IS NULL OR fi.active_until >= NOW())
            ORDER BY fi.display_order ASC, fi.created_at DESC
        `

    const result = await db.query(query)

    // Transform the data for the frontend
    const featuredItems = result.rows.map((row) => ({
      id: row.item_id,
      type: row.item_type,
      title: row.custom_title || row.original_item_name || "Featured Item",
      description: row.custom_description || row.original_item_description || "",
      imageUrl:
        row.custom_image_url || row.original_item_image_url || "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
      listType: row.list_type || null,
    }))

    res.json(featuredItems)
  } catch (error) {
    console.error("Error fetching featured items:", error)
    res.status(500).json({ error: "Failed to fetch featured items" })
  }
})

// Get items in a featured list
router.get("/list/:listId", async (req, res) => {
  try {
    const { listId } = req.params

    const query = `
            SELECT 
                fli.id as list_item_id,
                fli.item_type,
                fli.display_order,
                CASE 
                    WHEN fli.item_type = 'product' THEN p.id
                    WHEN fli.item_type = 'deal' THEN d.id
                END as item_id,
                CASE 
                    WHEN fli.item_type = 'product' THEN p.name
                    WHEN fli.item_type = 'deal' THEN d.title
                END as item_name,
                CASE 
                    WHEN fli.item_type = 'product' THEN p.description
                    WHEN fli.item_type = 'deal' THEN d.description
                END as item_description,
                CASE 
                    WHEN fli.item_type = 'product' THEN p.image_url
                    WHEN fli.item_type = 'deal' THEN d.image_url
                END as item_image_url,
                CASE 
                    WHEN fli.item_type = 'product' THEN p.price
                    WHEN fli.item_type = 'deal' THEN d.discount_percentage
                END as item_price,
                CASE 
                    WHEN fli.item_type = 'product' THEN p.supplier_id
                END as supplier_id
            FROM featured_list_items fli
            LEFT JOIN products p ON fli.item_type = 'product' AND fli.item_id = p.id
            LEFT JOIN deals d ON fli.item_type = 'deal' AND fli.item_id = d.id
            WHERE fli.featured_list_id = $1
            ORDER BY fli.display_order ASC
        `

    const result = await db.query(query, [listId])

    const items = result.rows.map((row) => ({
      id: row.item_id,
      type: row.item_type,
      name: row.item_name,
      description: row.item_description,
      imageUrl: row.item_image_url,
      price: row.item_price,
      supplierId: row.supplier_id,
    }))

    res.json(items)
  } catch (error) {
    console.error("Error fetching list items:", error)
    res.status(500).json({ error: "Failed to fetch list items" })
  }
})

module.exports = router
