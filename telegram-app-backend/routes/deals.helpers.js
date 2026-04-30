const db = require('../config/db');

const hasAtLeastOneField = (reqBody, keys) => keys.some((key) => reqBody[key] !== undefined);

const ensureProductBelongsToSupplier = async (supplierId, productId) => {
  if (productId === undefined || productId === null) return true;
  const productResult = await db.query(
    'SELECT 1 FROM products WHERE id = $1 AND supplier_id = $2',
    [productId, supplierId]
  );
  return productResult.rows.length > 0;
};

module.exports = {
  hasAtLeastOneField,
  ensureProductBelongsToSupplier
};
