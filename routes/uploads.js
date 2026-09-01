const express = require('express');
const router = express.Router();
const multer = require('multer');
const upload = require('../middleware/upload');
const { uploadImage } = require('../controllers/uploadController');
const { requireAuth } = require('../middleware/auth');

// Wrap multer so file-type/size rejections come back as a clean 400
// instead of falling through to the generic 500 handler.
function handleUpload(req, res, next) {
  upload.single('image')(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ status: 'error', message: 'Image must be under 5MB' });
      }
      return res.status(400).json({ status: 'error', message: err.message });
    }
    if (err) {
      return res.status(400).json({ status: 'error', message: err.message });
    }
    next();
  });
}

router.post('/image', requireAuth, handleUpload, uploadImage);

module.exports = router;
