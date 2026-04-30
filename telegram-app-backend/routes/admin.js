// routes/admin.js
const express = require("express");
const router = express.Router();
const authAdmin = require("../middleware/authAdmin");

router.use(authAdmin);

router.use('/', require('./admin/adminSuppliers.routes'));
router.use('/', require('./admin/adminFeatured.routes'));
router.use('/', require('./admin/adminOps.routes'));

module.exports = router;
