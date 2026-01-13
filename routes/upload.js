// routes/upload.js
const express = require('express');
const router = express.Router();
const multer = require('multer');
const { cloudinary } = require('../cloudinaryStorage'); // use our existing cloudinaryStorage.js
const streamifier = require('streamifier');

// Use multer memory storage for streaming upload
const storage = multer.memoryStorage();
const upload = multer({ storage });

router.post('/upload', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).send('No file uploaded');

    // Upload file buffer to Cloudinary
    const streamUpload = (fileBuffer) => {
      return new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          { folder: 'AirbnbUploads' }, // Cloudinary folder
          (error, result) => {
            if (result) resolve(result);
            else reject(error);
          }
        );
        streamifier.createReadStream(fileBuffer).pipe(stream);
      });
    };

    const result = await streamUpload(req.file.buffer);
    res.json({ url: result.secure_url }); // return uploaded file URL

  } catch (err) {
    console.error(err);
    res.status(500).send(err.message);
  }
});

module.exports = router;
