// cloudinaryStorage.js
const cloudinary = require("cloudinary").v2;
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const multer = require("multer");

// ------------------ Cloudinary Config ------------------
cloudinary.config({
  cloud_name: process.env.CLOUD_NAME,       // matches your .env
  api_key: process.env.CLOUD_API_KEY,      // matches your .env
  api_secret: process.env.CLOUD_API_SECRET // matches your .env
});

// ------------------ Warn if env vars are missing ------------------
const missing = [];
if (!process.env.CLOUD_NAME) missing.push("CLOUD_NAME");
if (!process.env.CLOUD_API_KEY) missing.push("CLOUD_API_KEY");
if (!process.env.CLOUD_API_SECRET) missing.push("CLOUD_API_SECRET");

if (missing.length) {
  console.error(
    `Cloudinary env vars missing: ${missing.join(", ")}.\n` +
    "Please set them in your Render service environment settings."
  );
}

// ------------------ Cloudinary Storage ------------------
const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "StayBnb",                     // folder in Cloudinary
    allowed_formats: ["jpeg", "jpg", "png", "webp"], // supported image formats
  },
});

// ------------------ Multer Upload ------------------
const upload = multer({ storage });

module.exports = { cloudinary, storage, upload };
