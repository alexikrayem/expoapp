const { enqueueProductLinking } = require('../services/linkingQueue');
const { linkProduct } = require('../services/productLinkingService');
const logger = require('../services/logger');

const triggerProductLinking = async (productId, options = {}) => {
  try {
    const enqueued = await enqueueProductLinking(productId, options);
    if (!enqueued) {
      const inlineResult = await linkProduct(productId, options);
      return {
        status: inlineResult?.status || 'processed',
        queued: false,
      };
    }
    return { status: 'queued', queued: true };
  } catch (error) {
    logger.error('Product linking trigger failed', error, { productId });
    return {
      status: 'failed',
      queued: false,
      error: error?.message || 'Product linking failed',
    };
  }
};

const isPublicSupplierRequest = (req) => {
  if (req.method !== 'GET') return false;
  if (req.path === '/' || req.path === '') return true;
  return /^\/\d+$/.test(req.path);
};

module.exports = {
  triggerProductLinking,
  isPublicSupplierRequest
};
