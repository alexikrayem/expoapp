const { query, param, body } = require('express-validator');
const validateRequest = require('../../middleware/validateRequest');
const HTTP = Object.freeze({
    OK: Number.parseInt('200', 10),
    CREATED: Number.parseInt('201', 10),
    BAD_REQUEST: Number.parseInt('400', 10),
    NOT_FOUND: Number.parseInt('404', 10),
    CONFLICT: Number.parseInt('409', 10),
    INTERNAL_SERVER_ERROR: Number.parseInt('500', 10)
});

const VALIDATION_LIMITS = Object.freeze({
    MAX_ARRAY_ITEMS: Number.parseInt('500', 10),
    MAX_ENTITY_ID: Number.parseInt('9999999', 10),
    MAX_NAME_LENGTH: Number.parseInt('255', 10),
    MAX_CATEGORY_LENGTH: Number.parseInt('100', 10),
    MAX_DESCRIPTION_LENGTH: Number.parseInt('5000', 10),
    MAX_URL_LENGTH: Number.parseInt('2048', 10),
    MAX_STOCK_LEVEL: Number.parseInt('1000000', 10),
    MIN_PASSWORD_LENGTH: 8,
    MAX_PASSWORD_LENGTH: Number.parseInt('128', 10)
});

const CACHE_TTL_SECONDS = Object.freeze({
    SUPPLIER_DETAIL: Number.parseInt('120', 10)
});


const validateSupplierCitiesUpdate = [
    body('city_ids').isArray({ max: VALIDATION_LIMITS.MAX_ARRAY_ITEMS }).withMessage(`city_ids must be an array (max ${VALIDATION_LIMITS.MAX_ARRAY_ITEMS} entries)`),
    body('city_ids.*').isInt({ min: 1, max: VALIDATION_LIMITS.MAX_ENTITY_ID }).withMessage('Each city ID must be a positive integer'),
    validateRequest
];

const validateSupplierProductCreate = [
    body('name').trim().notEmpty().withMessage('Name is required').isLength({ max: VALIDATION_LIMITS.MAX_NAME_LENGTH }).withMessage(`Name must be at most ${VALIDATION_LIMITS.MAX_NAME_LENGTH} characters`),
    body('standardized_name_input').trim().notEmpty().withMessage('Standardized name is required').isLength({ max: VALIDATION_LIMITS.MAX_NAME_LENGTH }).withMessage(`Standardized name must be at most ${VALIDATION_LIMITS.MAX_NAME_LENGTH} characters`),
    body('price').isFloat({ min: 0, max: VALIDATION_LIMITS.MAX_ENTITY_ID }).withMessage('Price must be a positive number'),
    body('discount_price').optional({ nullable: true }).isFloat({ min: 0, max: VALIDATION_LIMITS.MAX_ENTITY_ID }).withMessage('Discount price must be a positive number'),
    body('category').trim().notEmpty().withMessage('Category is required').isLength({ max: VALIDATION_LIMITS.MAX_CATEGORY_LENGTH }).withMessage(`Category must be at most ${VALIDATION_LIMITS.MAX_CATEGORY_LENGTH} characters`),
    body('description').optional({ nullable: true }).isLength({ max: VALIDATION_LIMITS.MAX_DESCRIPTION_LENGTH }).withMessage(`Description must be at most ${VALIDATION_LIMITS.MAX_DESCRIPTION_LENGTH} characters`),
    body('image_url').optional({ nullable: true }).isLength({ max: VALIDATION_LIMITS.MAX_URL_LENGTH }).withMessage(`Image URL must be at most ${VALIDATION_LIMITS.MAX_URL_LENGTH} characters`),
    body('is_on_sale').optional().isBoolean().withMessage('is_on_sale must be a boolean'),
    body('stock_level').optional().isInt({ min: 0, max: VALIDATION_LIMITS.MAX_STOCK_LEVEL }).withMessage(`Stock level must be an integer between 0 and ${VALIDATION_LIMITS.MAX_STOCK_LEVEL}`),
    validateRequest
];

const validateSupplierProductUpdate = [
    param('id').isInt({ min: 1, max: VALIDATION_LIMITS.MAX_ENTITY_ID }).withMessage('Product ID must be a positive integer'),
    body('name').optional().trim().notEmpty().withMessage('Name cannot be empty').isLength({ max: VALIDATION_LIMITS.MAX_NAME_LENGTH }).withMessage(`Name must be at most ${VALIDATION_LIMITS.MAX_NAME_LENGTH} characters`),
    body('standardized_name_input').optional().trim().notEmpty().withMessage('Standardized name cannot be empty').isLength({ max: VALIDATION_LIMITS.MAX_NAME_LENGTH }).withMessage(`Standardized name must be at most ${VALIDATION_LIMITS.MAX_NAME_LENGTH} characters`),
    body('price').optional().isFloat({ min: 0, max: VALIDATION_LIMITS.MAX_ENTITY_ID }).withMessage('Price must be a positive number'),
    body('discount_price').optional({ nullable: true }).isFloat({ min: 0, max: VALIDATION_LIMITS.MAX_ENTITY_ID }).withMessage('Discount price must be a positive number'),
    body('category').optional().trim().notEmpty().withMessage('Category cannot be empty').isLength({ max: VALIDATION_LIMITS.MAX_CATEGORY_LENGTH }).withMessage(`Category must be at most ${VALIDATION_LIMITS.MAX_CATEGORY_LENGTH} characters`),
    body('description').optional({ nullable: true }).isLength({ max: VALIDATION_LIMITS.MAX_DESCRIPTION_LENGTH }).withMessage(`Description must be at most ${VALIDATION_LIMITS.MAX_DESCRIPTION_LENGTH} characters`),
    body('image_url').optional({ nullable: true }).isLength({ max: VALIDATION_LIMITS.MAX_URL_LENGTH }).withMessage(`Image URL must be at most ${VALIDATION_LIMITS.MAX_URL_LENGTH} characters`),
    body('is_on_sale').optional().isBoolean().withMessage('is_on_sale must be a boolean'),
    body('stock_level').optional().isInt({ min: 0, max: VALIDATION_LIMITS.MAX_STOCK_LEVEL }).withMessage(`Stock level must be an integer between 0 and ${VALIDATION_LIMITS.MAX_STOCK_LEVEL}`),
    validateRequest
];

const validateSupplierProductIdParam = [
    param('id').isInt({ min: 1, max: VALIDATION_LIMITS.MAX_ENTITY_ID }).withMessage('Product ID must be a positive integer'),
    validateRequest
];

const validateSupplierProductsList = [
    query('page').optional().isInt({ min: 1, max: 1000 }).withMessage('Page must be between 1 and 1000'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
    validateRequest
];

const validateSupplierBulkStockUpdate = [
    body('updates').isArray({ min: 1, max: VALIDATION_LIMITS.MAX_ARRAY_ITEMS }).withMessage(`Updates must be an array with 1 to ${VALIDATION_LIMITS.MAX_ARRAY_ITEMS} entries`),
    body('updates.*.id').isInt({ min: 1, max: VALIDATION_LIMITS.MAX_ENTITY_ID }).withMessage('Each update must include a valid product id'),
    body('updates.*.stock_level').isInt({ min: 0, max: VALIDATION_LIMITS.MAX_STOCK_LEVEL }).withMessage('Each update must include a non-negative stock_level'),
    validateRequest
];

const validateDeliveryAgentCreate = [
    body('full_name').trim().notEmpty().withMessage('Full name is required').isLength({ max: VALIDATION_LIMITS.MAX_NAME_LENGTH }).withMessage(`Full name must be at most ${VALIDATION_LIMITS.MAX_NAME_LENGTH} characters`),
    body('phone_number').trim().notEmpty().withMessage('Phone number is required').isLength({ min: 6, max: 30 }).withMessage('Phone number must be between 6 and 30 characters'),
    body('password').notEmpty().withMessage('Password is required').isLength({ min: VALIDATION_LIMITS.MIN_PASSWORD_LENGTH, max: VALIDATION_LIMITS.MAX_PASSWORD_LENGTH }).withMessage(`Password must be between ${VALIDATION_LIMITS.MIN_PASSWORD_LENGTH} and ${VALIDATION_LIMITS.MAX_PASSWORD_LENGTH} characters`),
    body('email').optional({ nullable: true }).isEmail().withMessage('Email must be valid'),
    body('telegram_user_id').optional({ nullable: true }).custom((value) => /^\d{5,20}$/.test(String(value))).withMessage('telegram_user_id must be a numeric string'),
    body('is_active').optional().isBoolean().withMessage('is_active must be a boolean'),
    validateRequest
];

const validateDeliveryAgentUpdate = [
    param('id').isInt({ min: 1, max: VALIDATION_LIMITS.MAX_ENTITY_ID }).withMessage('Delivery agent ID must be a positive integer'),
    body('full_name').optional().trim().notEmpty().withMessage('Full name cannot be empty').isLength({ max: VALIDATION_LIMITS.MAX_NAME_LENGTH }).withMessage(`Full name must be at most ${VALIDATION_LIMITS.MAX_NAME_LENGTH} characters`),
    body('phone_number').optional().trim().notEmpty().withMessage('Phone number cannot be empty').isLength({ min: 6, max: 30 }).withMessage('Phone number must be between 6 and 30 characters'),
    body('email').optional({ nullable: true }).isEmail().withMessage('Email must be valid'),
    body('telegram_user_id').optional({ nullable: true }).custom((value) => /^\d{5,20}$/.test(String(value))).withMessage('telegram_user_id must be a numeric string'),
    body('is_active').optional().isBoolean().withMessage('is_active must be a boolean'),
    validateRequest
];

const validateDeliveryAgentIdParam = [
    param('id').isInt({ min: 1, max: VALIDATION_LIMITS.MAX_ENTITY_ID }).withMessage('Delivery agent ID must be a positive integer'),
    validateRequest
];

// ------------------------

const validateSupplierOrdersList = [
    query('page').optional().isInt({ min: 1, max: 1000 }).withMessage('Page must be between 1 and 1000'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
    query('status').optional().isIn(['all', 'pending', 'confirmed', 'assigned_to_agent', 'out_for_delivery', 'delivered', 'cancelled', 'payment_pending', 'ready_for_pickup']).withMessage('Invalid status'),
    validateRequest
];


module.exports = {
    HTTP,
    VALIDATION_LIMITS,
    CACHE_TTL_SECONDS,
    validateSupplierCitiesUpdate,
    validateSupplierProductCreate,
    validateSupplierProductUpdate,
    validateSupplierProductIdParam,
    validateSupplierProductsList,
    validateSupplierBulkStockUpdate,
    validateDeliveryAgentCreate,
    validateDeliveryAgentUpdate,
    validateDeliveryAgentIdParam,
    validateSupplierOrdersList
};
