// routes/suppliers.js
const express = require('express');
const router = express.Router();
const authSupplier = require('../middleware/authSupplier');
const { isPublicSupplierRequest } = require('./suppliers.helpers');
const { HTTP } = require('./suppliers/supplierUtils');

router.use((req, res, next) => {
    const isPublicRequest = isPublicSupplierRequest(req);

    // Public mount: expose only list/detail and hide private endpoints.
    if (req.baseUrl === '/api/suppliers') {
        if (isPublicRequest) return next();
        return res.status(HTTP.NOT_FOUND).json({ error: 'Route not found' });
    }

    // Private mount: enforce auth and hide public list/detail aliases.
    if (req.baseUrl === '/api/supplier') {
        if (isPublicRequest) {
            return res.status(HTTP.NOT_FOUND).json({ error: 'Route not found' });
        }
        return authSupplier(req, res, next);
    }

    if (isPublicRequest) return next();
    return authSupplier(req, res, next);
});

router.use('/', require('./suppliers/supplierProfile.routes'));
router.use('/', require('./suppliers/supplierProducts.routes'));
router.use('/', require('./suppliers/supplierStats.routes'));
router.use('/', require('./suppliers/supplierAgents.routes'));
router.use('/', require('./suppliers/supplierPublic.routes'));

module.exports = router;
