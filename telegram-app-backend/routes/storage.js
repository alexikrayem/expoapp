// routes/storage.js
const express = require('express');
const { body } = require('express-validator');
const authUploader = require('../middleware/authUploader');
const validateRequest = require('../middleware/validateRequest');
const { createSignedUpload } = require('../services/storageService');

const router = express.Router();

router.post(
  '/signed-upload',
  authUploader,
  [
    body('filename').isString().notEmpty().withMessage('filename is required'),
    body('folder').optional().isString(),
    body('bucket').optional().isString(),
    body('expiresIn').optional().isInt({ min: 60, max: 3600 }),
  ],
  validateRequest,
  async (req, res) => {
    try {
      const { filename, folder, bucket, expiresIn } = req.body;
      const upload = await createSignedUpload({
        filename,
        folder,
        bucket,
        expiresIn,
      });
      res.json(upload);
    } catch (error) {
      res.status(500).json({ error: 'Failed to create signed upload URL' });
    }
  }
);

module.exports = router;
