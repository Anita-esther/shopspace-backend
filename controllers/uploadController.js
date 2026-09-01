const { Readable } = require('stream');
const cloudinary = require('../config/cloudinary');

// POST /api/uploads/image
// Expects a single multipart field named "image".
// Uploads the file buffer straight to Cloudinary (no disk write) and returns
// the permanent https URL so the frontend can save it as a product's image_url.
async function uploadImage(req, res) {
  if (!req.file) {
    return res.status(400).json({ status: 'error', message: 'No image file was provided' });
  }

  try {
    const result = await new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: 'shopspace/products',
          resource_type: 'image',
        },
        (error, uploadResult) => {
          if (error) reject(error);
          else resolve(uploadResult);
        }
      );
      Readable.from(req.file.buffer).pipe(uploadStream);
    });

    res.json({ status: 'ok', url: result.secure_url });
  } catch (err) {
    console.error('Cloudinary upload failed:', err);
    res.status(502).json({ status: 'error', message: 'Image upload failed. Please try again.' });
  }
}

module.exports = { uploadImage };
