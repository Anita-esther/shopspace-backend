const multer = require('multer');

// Render's free tier disk is wiped on every redeploy, so we never write files
// to disk here — just hold the upload in memory long enough to forward it to
// Cloudinary.
const storage = multer.memoryStorage();

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

function fileFilter(req, file, cb) {
  if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    cb(new Error('Only JPG, PNG, or WEBP images are allowed'));
    return;
  }
  cb(null, true);
}

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: MAX_FILE_SIZE_BYTES },
});

module.exports = upload;
