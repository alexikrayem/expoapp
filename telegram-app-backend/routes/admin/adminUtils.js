const { body, param } = require("express-validator");
const validateRequest = require("../../middleware/validateRequest");

const validateCreateSupplier = [
    body('name').trim().notEmpty().isLength({ max: 255 }),
    body('email').isEmail().normalizeEmail(),
    body('password').notEmpty().isLength({ min: 8, max: 128 }),
    body('category').trim().notEmpty().isLength({ max: 100 }),
    body('location').optional({ nullable: true }).isString(),
    body('rating').optional({ nullable: true }).isFloat({ min: 0, max: 5 }),
    body('description').optional({ nullable: true }).isLength({ max: 5000 }),
    body('image_url').optional({ nullable: true }).isString(),
    body('is_active').optional().isBoolean(),
    validateRequest
];

const validateUpdateSupplier = [
    param('id').isInt({ min: 1 }),
    body('name').optional().trim().notEmpty().isLength({ max: 255 }),
    body('email').optional().isEmail().normalizeEmail(),
    body('category').optional().trim().notEmpty().isLength({ max: 100 }),
    body('location').optional({ nullable: true }).isString(),
    body('rating').optional({ nullable: true }).isFloat({ min: 0, max: 5 }),
    body('description').optional({ nullable: true }).isLength({ max: 5000 }),
    body('image_url').optional({ nullable: true }).isString(),
    body('is_active').optional().isBoolean(),
    validateRequest
];

const validateCreateFeaturedItem = [
    body('item_type').isIn(['product', 'deal', 'supplier']),
    body('item_id').isInt({ min: 1 }),
    body('display_order').optional().isInt(),
    body('custom_title').optional({ nullable: true }).isString().isLength({ max: 255 }),
    body('custom_description').optional({ nullable: true }).isString().isLength({ max: 5000 }),
    body('custom_image_url').optional({ nullable: true }).isString(),
    body('is_active').optional().isBoolean(),
    body('active_from').optional({ nullable: true }).isISO8601(),
    body('active_until').optional({ nullable: true }).isISO8601(),
    validateRequest
];

const validateUpdateFeaturedItem = [
    param('id').isInt({ min: 1 }),
    body('item_type').optional().isIn(['product', 'deal', 'supplier']),
    body('item_id').optional().isInt({ min: 1 }),
    body('display_order').optional().isInt(),
    body('custom_title').optional({ nullable: true }).isString().isLength({ max: 255 }),
    body('custom_description').optional({ nullable: true }).isString().isLength({ max: 5000 }),
    body('custom_image_url').optional({ nullable: true }).isString(),
    body('is_active').optional().isBoolean(),
    body('active_from').optional({ nullable: true }).isISO8601(),
    body('active_until').optional({ nullable: true }).isISO8601(),
    validateRequest
];

const validateBroadcast = [
    body('message').trim().notEmpty().isLength({ max: 4000 }),
    validateRequest
];

const validateCreateFeaturedList = [
    body('list_name').trim().notEmpty().isLength({ max: 255 }),
    body('list_type').isIn(['products', 'deals']),
    body('description').optional({ nullable: true }).isString().isLength({ max: 5000 }),
    body('custom_image_url').optional({ nullable: true }).isString(),
    body('is_active').optional().isBoolean(),
    body('display_order').optional().isInt(),
    body('items').optional().isArray(),
    body('items.*.item_type').optional().isIn(['product', 'deal', 'supplier']),
    body('items.*.item_id').optional().isInt({ min: 1 }),
    validateRequest
];

const HTTP = Object.freeze({
  BAD_REQUEST: Number.parseInt("400", 10),
  NOT_FOUND: Number.parseInt("404", 10),
  CONFLICT: Number.parseInt("409", 10),
  CREATED: Number.parseInt("201", 10),
  INTERNAL_SERVER_ERROR: Number.parseInt("500", 10),
});

const ADMIN_CACHE_KEYS = Object.freeze([
  "products:list",
  "products:categories",
  "products:detail",
  "products:batch",
  "products:favorite-details",
  "suppliers:list",
  "suppliers:detail",
  "deals:list",
  "deals:detail",
  "search",
  "featured:items",
  "featured:list",
]);

const FEATURED_CACHE_KEYS = Object.freeze(["featured:items", "featured:list"]);
const FEATURED_LIST_CACHE_KEYS = Object.freeze(["featured:list", "featured:items"]);

module.exports = {
    validateCreateSupplier,
    validateUpdateSupplier,
    validateCreateFeaturedItem,
    validateUpdateFeaturedItem,
    validateBroadcast,
    validateCreateFeaturedList,
    HTTP,
    ADMIN_CACHE_KEYS,
    FEATURED_CACHE_KEYS,
    FEATURED_LIST_CACHE_KEYS
};
