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

const FEATURE_ENTITY_QUERY_BY_TYPE = Object.freeze({
  product: Object.freeze({
    exists: "SELECT id FROM products WHERE id = $1 LIMIT 1",
    bulkExists: "SELECT id FROM products WHERE id = ANY($1::int[])",
  }),
  deal: Object.freeze({
    exists: "SELECT id FROM deals WHERE id = $1 LIMIT 1",
    bulkExists: "SELECT id FROM deals WHERE id = ANY($1::int[])",
  }),
  supplier: Object.freeze({
    exists: "SELECT id FROM suppliers WHERE id = $1 LIMIT 1",
    bulkExists: "SELECT id FROM suppliers WHERE id = ANY($1::int[])",
  }),
});

const LIST_TYPE_ALLOWED_ITEM_TYPES = Object.freeze({
  products: new Set(["product"]),
  deals: new Set(["deal"]),
});

const isValidFeaturedItemTypeForList = function (listType, itemType) {
  const allowedTypes = LIST_TYPE_ALLOWED_ITEM_TYPES[listType];
  if (!allowedTypes) return false;
  return allowedTypes.has(itemType);
};

const getFeatureEntityQueries = function (itemType) {
  const queries = FEATURE_ENTITY_QUERY_BY_TYPE[itemType];
  if (!queries) throw new Error(`Unknown item type: ${itemType}`);
  return queries;
};

const ensureFeatureEntityExists = async function (client, itemType, itemId) {
  const { exists } = getFeatureEntityQueries(itemType);
  const result = await client.query(exists, [itemId]);
  return result.rows.length > 0;
};

const validateFeaturedListItems = async function ({ client, listType, items }) {
  const idsByType = new Map();

  for (const item of items || []) {
    const itemType = item?.item_type;
    const itemId = Number(item?.item_id);
    if (!itemType || !Number.isInteger(itemId) || itemId <= 0) continue;

    if (!isValidFeaturedItemTypeForList(listType, itemType)) {
      return `Item type "${itemType}" is not allowed for list type "${listType}"`;
    }

    const current = idsByType.get(itemType) || [];
    current.push(itemId);
    idsByType.set(itemType, current);
  }

  for (const [itemType, ids] of idsByType.entries()) {
    const queries = FEATURE_ENTITY_QUERY_BY_TYPE[itemType];
    const uniqueIds = Array.from(new Set(ids));
    if (!queries || uniqueIds.length === 0) {
      continue;
    }

    const result = await client.query(queries.bulkExists, [uniqueIds]);
    if (result.rows.length !== uniqueIds.length) {
      const foundIds = new Set(result.rows.map((row) => Number(row.id)));
      const missingIds = uniqueIds.filter((id) => !foundIds.has(id));
      return `Missing ${itemType} reference(s): ${missingIds.join(", ")}`;
    }
  }

  return null;
};

// Get featured items definitions (admin only)
router.get("/featured-items-definitions", async (req, res) => {
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
    logger.error("Error fetching featured items definitions", error)
    res.status(HTTP.INTERNAL_SERVER_ERROR).json({ error: "Failed to fetch featured items definitions" })
  }
})

// Create featured item (admin only)
router.post("/featured-items", validateCreateFeaturedItem, async (req, res) => {
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
      return res.status(HTTP.BAD_REQUEST).json({ error: "Item type and item ID are required" })
    }

    const exists = await ensureFeatureEntityExists(db, item_type, item_id);
    if (!exists) {
      return res.status(HTTP.BAD_REQUEST).json({ error: `Referenced ${item_type} does not exist` });
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

    void invalidateCache([...FEATURED_CACHE_KEYS])
    void recordAuditEvent({
      req,
      action: "featured_item_create",
      actorRole: "admin",
      actorId: req.admin?.adminId,
      targetType: "featured_item",
      targetId: result.rows[0]?.id,
      metadata: { item_type, item_id },
    })
    res.status(HTTP.CREATED).json(result.rows[0])
  } catch (error) {
    logger.error("Error creating featured item", error)
    res.status(HTTP.INTERNAL_SERVER_ERROR).json({ error: "Failed to create featured item" })
  }
})

// Update featured item (admin only)
router.put("/featured-items-definitions/:id", validateUpdateFeaturedItem, async (req, res) => {
  try {
    const { id } = req.params
    const existingResult = await db.query(
      "SELECT item_type, item_id FROM featured_items WHERE id = $1",
      [id]
    );
    if (existingResult.rows.length === 0) {
      return res.status(HTTP.NOT_FOUND).json({ error: "Featured item not found" });
    }

    const existingItem = existingResult.rows[0];
    const nextItemType = req.body.item_type ?? existingItem.item_type;
    const nextItemId = Number(req.body.item_id ?? existingItem.item_id);
    const exists = await ensureFeatureEntityExists(db, nextItemType, nextItemId);
    if (!exists) {
      return res.status(HTTP.BAD_REQUEST).json({ error: `Referenced ${nextItemType} does not exist` });
    }

    const { updateFields, updateValues, updatedFieldNames, nextParamIndex } = buildDynamicUpdate({
      payload: req.body,
      fieldMap: {
        item_type: {},
        item_id: {},
        display_order: {},
        custom_title: {},
        custom_description: {},
        custom_image_url: {},
        is_active: {},
        active_from: {},
        active_until: {},
      },
    });

    if (updateFields.length === 0) {
      return res.status(HTTP.BAD_REQUEST).json({ error: "No fields to update" })
    }

    updateFields.push(`updated_at = NOW()`)
    updateValues.push(id)

    const updateQuery = `
            UPDATE featured_items 
            SET ${updateFields.join(", ")}
            WHERE id = $${nextParamIndex}
            RETURNING *
        `

    const result = await db.query(updateQuery, updateValues)

    if (result.rows.length === 0) {
      return res.status(HTTP.NOT_FOUND).json({ error: "Featured item not found" })
    }

    void invalidateCache([...FEATURED_CACHE_KEYS])
    void recordAuditEvent({
      req,
      action: "featured_item_update",
      actorRole: "admin",
      actorId: req.admin?.adminId,
      targetType: "featured_item",
      targetId: Number(id),
      metadata: { updated_fields: updatedFieldNames },
    })
    res.json(result.rows[0])
  } catch (error) {
    logger.error("Error updating featured item", error)
    res.status(HTTP.INTERNAL_SERVER_ERROR).json({ error: "Failed to update featured item" })
  }
})

// Delete featured item (admin only)
router.delete("/featured-items-definitions/:id", async (req, res) => {
  try {
    const { id } = req.params

    const deleteQuery = "DELETE FROM featured_items WHERE id = $1 RETURNING id"
    const result = await db.query(deleteQuery, [id])

    if (result.rows.length === 0) {
      return res.status(HTTP.NOT_FOUND).json({ error: "Featured item not found" })
    }

    void invalidateCache([...FEATURED_CACHE_KEYS])
    void recordAuditEvent({
      req,
      action: "featured_item_delete",
      actorRole: "admin",
      actorId: req.admin?.adminId,
      targetType: "featured_item",
      targetId: Number(id),
    })
    res.json({ message: "Featured item deleted successfully" })
  } catch (error) {
    logger.error("Error deleting featured item", error)
    res.status(HTTP.INTERNAL_SERVER_ERROR).json({ error: "Failed to delete featured item" })
  }
})

// Get all featured lists (admin only)
router.get("/featured-lists", async (req, res) => {
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
            LIMIT 100
        `

    const result = await db.query(query)
    res.json({ items: result.rows })
  } catch (error) {
    logger.error("Error fetching featured lists", error)
    res.status(HTTP.INTERNAL_SERVER_ERROR).json({ error: "Failed to fetch featured lists" })
  }
})

// Get featured list with all its items (admin only)
router.get("/featured-lists/:id", async (req, res) => {
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
      return res.status(HTTP.NOT_FOUND).json({ error: "Featured list not found" })
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
    logger.error("Error fetching featured list", error)
    res.status(HTTP.INTERNAL_SERVER_ERROR).json({ error: "Failed to fetch featured list" })
  }
})

// Create featured list (admin only)
router.post("/featured-lists", validateCreateFeaturedList, async (req, res) => {
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
      return res.status(HTTP.BAD_REQUEST).json({ error: "List name and type are required" })
    }

    if (!["products", "deals"].includes(list_type)) {
      return res.status(HTTP.BAD_REQUEST).json({ error: 'List type must be "products" or "deals"' })
    }

    const client = await db.pool.connect();
    let listId;
    try {
      await client.query('BEGIN');

      // Create the list
      const insertListQuery = `
                INSERT INTO featured_lists (
                    list_name, list_type, description, custom_image_url, 
                    is_active, display_order, created_by
                ) VALUES ($1, $2, $3, $4, $5, $6, $7)
                RETURNING id
            `

      const listResult = await client.query(insertListQuery, [
        list_name,
        list_type,
        description,
        custom_image_url,
        is_active,
        display_order,
        req.admin.adminId,
      ])

      listId = listResult.rows[0].id

      // Add items to the list if provided
      if (items && items.length > 0) {
        const itemsValidationError = await validateFeaturedListItems({
          client,
          listType: list_type,
          items,
        });
        if (itemsValidationError) {
          await client.query('ROLLBACK');
          return res.status(HTTP.BAD_REQUEST).json({ error: itemsValidationError });
        }

        const itemTypes = [];
        const itemIds = [];
        const displayOrders = [];
        let validIndex = 0;
        for (let i = 0; i < items.length; i++) {
          const { item_type, item_id } = items[i]
          if (!item_type || !item_id) continue
          itemTypes.push(item_type);
          itemIds.push(item_id);
          displayOrders.push(validIndex++);
        }
        if (itemTypes.length > 0) {
          const insertItemQuery = `
                INSERT INTO featured_list_items (
                    featured_list_id, item_type, item_id, display_order
                )
                SELECT $1, unnest($2::text[]), unnest($3::int[]), unnest($4::int[])
                ON CONFLICT DO NOTHING
            `;
          await client.query(insertItemQuery, [listId, itemTypes, itemIds, displayOrders])
        }
      }
      await client.query('COMMIT');
    } catch (dbError) {
      await client.query('ROLLBACK');
      throw dbError;
    } finally {
      client.release();
    }

    void invalidateCache([...FEATURED_LIST_CACHE_KEYS])
    void recordAuditEvent({
      req,
      action: "featured_list_create",
      actorRole: "admin",
      actorId: req.admin?.adminId,
      targetType: "featured_list",
      targetId: listId,
      metadata: { list_type, item_count: items?.length || 0 },
    })
    res.status(HTTP.CREATED).json({
      id: listId,
      message: "Featured list created successfully",
    })
  } catch (error) {
    logger.error("Error creating featured list", error)
    res.status(HTTP.INTERNAL_SERVER_ERROR).json({ error: "Failed to create featured list" })
  }
})

// Update featured list (admin only)
router.put("/featured-lists/:id", async (req, res) => {
  try {
    const { id } = req.params
    const { items } = req.body
    const { updateFields, updateValues, updatedFieldNames, nextParamIndex } = buildDynamicUpdate({
      payload: req.body,
      fieldMap: {
        list_name: {},
        description: {},
        custom_image_url: {},
        is_active: {},
        display_order: {},
      },
    });

    if (updateFields.length === 0 && (!items || items.length === 0)) {
      return res.status(HTTP.BAD_REQUEST).json({ error: "No fields to update" })
    }

    const client = await db.pool.connect();
    try {
      await client.query('BEGIN');

      const existingListResult = await client.query(
        "SELECT list_type FROM featured_lists WHERE id = $1 FOR UPDATE",
        [id]
      );
      if (existingListResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(HTTP.NOT_FOUND).json({ error: "Featured list not found" });
      }
      const listType = existingListResult.rows[0].list_type;

      // Update list metadata if there are changes
      if (updateFields.length > 0) {
        updateFields.push(`updated_at = NOW()`)
        updateValues.push(id)

        const updateQuery = `
                    UPDATE featured_lists 
                    SET ${updateFields.join(", ")}
                    WHERE id = $${nextParamIndex}
                `

        await client.query(updateQuery, updateValues)
      }

      // When items are provided, replace the list items
      if (items && items.length > 0) {
        const itemsValidationError = await validateFeaturedListItems({
          client,
          listType,
          items,
        });
        if (itemsValidationError) {
          await client.query('ROLLBACK');
          return res.status(HTTP.BAD_REQUEST).json({ error: itemsValidationError });
        }

        // Delete existing items
        await client.query("DELETE FROM featured_list_items WHERE featured_list_id = $1", [id])

        // Add new items
        const itemTypes = [];
        const itemIds = [];
        const displayOrders = [];
        let validIndex = 0;
        for (let i = 0; i < items.length; i++) {
          const { item_type, item_id } = items[i]
          if (!item_type || !item_id) continue
          itemTypes.push(item_type);
          itemIds.push(item_id);
          displayOrders.push(validIndex++);
        }
        if (itemTypes.length > 0) {
          const insertItemQuery = `
                INSERT INTO featured_list_items (
                    featured_list_id, item_type, item_id, display_order
                )
                SELECT $1, unnest($2::text[]), unnest($3::int[]), unnest($4::int[])
                ON CONFLICT (featured_list_id, item_type, item_id) DO UPDATE SET display_order = EXCLUDED.display_order
            `;
          await client.query(insertItemQuery, [id, itemTypes, itemIds, displayOrders])
        }
      }
      await client.query('COMMIT');
    } catch (dbError) {
      await client.query('ROLLBACK');
      throw dbError;
    } finally {
      client.release();
    }

    void invalidateCache([...FEATURED_LIST_CACHE_KEYS])
    void recordAuditEvent({
      req,
      action: "featured_list_update",
      actorRole: "admin",
      actorId: req.admin?.adminId,
      targetType: "featured_list",
      targetId: Number(id),
      metadata: {
        updated_fields: updatedFieldNames,
        item_count: items?.length,
      },
    })
    res.json({ message: "Featured list updated successfully" })
  } catch (error) {
    logger.error("Error updating featured list", error)
    res.status(HTTP.INTERNAL_SERVER_ERROR).json({ error: "Failed to update featured list" })
  }
})

// Delete featured list (admin only)
router.delete("/featured-lists/:id", async (req, res) => {
  try {
    const { id } = req.params

    const deleteQuery = "DELETE FROM featured_lists WHERE id = $1 RETURNING id"
    const result = await db.query(deleteQuery, [id])

    if (result.rows.length === 0) {
      return res.status(HTTP.NOT_FOUND).json({ error: "Featured list not found" })
    }

    void invalidateCache([...FEATURED_LIST_CACHE_KEYS])
    void recordAuditEvent({
      req,
      action: "featured_list_delete",
      actorRole: "admin",
      actorId: req.admin?.adminId,
      targetType: "featured_list",
      targetId: Number(id),
    })
    res.json({ message: "Featured list deleted successfully" })
  } catch (error) {
    logger.error("Error deleting featured list", error)
    res.status(HTTP.INTERNAL_SERVER_ERROR).json({ error: "Failed to delete featured list" })
  }
})

// Add items to featured list (admin only)
router.post("/featured-lists/:id/items", async (req, res) => {
  try {
    const { id } = req.params
    const { item_type, item_id, display_order = 0 } = req.body

    if (!item_type || !item_id) {
      return res.status(HTTP.BAD_REQUEST).json({ error: "Item type and ID are required" })
    }

    const listResult = await db.query("SELECT list_type FROM featured_lists WHERE id = $1", [id]);
    if (listResult.rows.length === 0) {
      return res.status(HTTP.NOT_FOUND).json({ error: "Featured list not found" });
    }

    const listType = listResult.rows[0].list_type;
    if (!isValidFeaturedItemTypeForList(listType, item_type)) {
      return res.status(HTTP.BAD_REQUEST).json({
        error: `Item type "${item_type}" is not allowed for list type "${listType}"`,
      });
    }

    const exists = await ensureFeatureEntityExists(db, item_type, Number(item_id));
    if (!exists) {
      return res.status(HTTP.BAD_REQUEST).json({ error: `Referenced ${item_type} does not exist` });
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
    void invalidateCache([...FEATURED_LIST_CACHE_KEYS])
    void recordAuditEvent({
      req,
      action: "featured_list_item_add",
      actorRole: "admin",
      actorId: req.admin?.adminId,
      targetType: "featured_list",
      targetId: Number(id),
      metadata: { item_type, item_id },
    })
    res.status(HTTP.CREATED).json(result.rows[0])
  } catch (error) {
    logger.error("Error adding item to list", error)
    res.status(HTTP.INTERNAL_SERVER_ERROR).json({ error: "Failed to add item to list" })
  }
})

// Remove item from featured list (admin only)
router.delete("/featured-lists/:id/items/:itemId", async (req, res) => {
  try {
    const { id, itemId } = req.params

    const deleteQuery = `
            DELETE FROM featured_list_items 
            WHERE featured_list_id = $1 AND id = $2
            RETURNING id
        `

    const result = await db.query(deleteQuery, [id, itemId])

    if (result.rows.length === 0) {
      return res.status(HTTP.NOT_FOUND).json({ error: "List item not found" })
    }

    void invalidateCache([...FEATURED_LIST_CACHE_KEYS])
    void recordAuditEvent({
      req,
      action: "featured_list_item_remove",
      actorRole: "admin",
      actorId: req.admin?.adminId,
      targetType: "featured_list",
      targetId: Number(id),
      metadata: { list_item_id: Number(itemId) },
    })
    res.json({ message: "Item removed from list" })
  } catch (error) {
    logger.error("Error removing item from list", error)
    res.status(HTTP.INTERNAL_SERVER_ERROR).json({ error: "Failed to remove item from list" })
  }
})


module.exports = router;
