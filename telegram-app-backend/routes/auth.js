const express = require('express');
const router = express.Router();

router.use('/', require('./auth/supplierAuth.routes'));
router.use('/', require('./auth/adminAuth.routes'));
router.use('/', require('./auth/deliveryAuth.routes'));
router.use('/', require('./auth/customerAuth.routes'));
router.use('/', require('./auth/commonAuth.routes'));

module.exports = router;
