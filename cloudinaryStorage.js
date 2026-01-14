const cloudinary = require("cloudinary").v2;
const { CloudinaryStorage } = require("multer-storage-cloudinary");

// ❌ remove dotenv here (Render ignores .env files)
// require("dotenv").config();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_KEY,
  api_secret: process.env.CLOUDINARY_SECRET,
});

// Warn at runtime if env vars are missing so Render logs surface the issue.
const missing = [];
if (!process.env.CLOUDINARY_CLOUD_NAME) missing.push('CLOUDINARY_CLOUD_NAME');
if (!process.env.CLOUDINARY_KEY) missing.push('CLOUDINARY_KEY');
if (!process.env.CLOUDINARY_SECRET) missing.push('CLOUDINARY_SECRET');
if (missing.length) {
  // Use console.error so Render/Heroku logs show prominently
  console.error(`Cloudinary env vars missing: ${missing.join(', ')}.\nPlease set them in your Render service environment settings.`);
}
const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "StayBnb",
    allowedFormats: ["jpeg", "png", "jpg"], // ✅ FIXED
  },
});

module.exports = { cloudinary, storage };
