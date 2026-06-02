const express = require('express');
const multer = require('multer');
const { postUpload } = require('./upload.controller');
const { protect } = require('../../middlewares/auth.middleware');

const router = express.Router();

// Initialize multer using memory storage to avoid writing local files prior to GCS stream resolution
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});

// Protect route (only logged-in tenant users can upload files)
router.post('/', protect, upload.single('file'), postUpload);

module.exports = router;
