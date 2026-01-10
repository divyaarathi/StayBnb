const express = require("express");
const router = express.Router();
const wrapAsync = require("../utils/wrapAsync.js");
const ExpressError = require("../utils/ExpressError.js");
const { listingSchema } = require("../schema.js");
const { isLoggedIn, isOwner } = require("../middleware.js");
const multer = require("multer");
const { storage } = require("../cloudConfig.js");
const upload = multer({ storage });
const listingsController = require("../controllers/listings.js");

// ---------------- MIDDLEWARE ----------------

// Validate Listing Input
const validateListing = (req, res, next) => {
  // Debug: show content-type and a safe snapshot of req.body to help diagnose
  try {
    console.log('--- validateListing DEBUG ---');
    console.log('Content-Type:', req.headers['content-type']);
    console.log('req.body keys:', Object.keys(req.body));
    const safe = {};
    Object.keys(req.body).forEach((k) => {
      try {
        const v = req.body[k];
        if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') safe[k] = v;
        else if (Array.isArray(v)) safe[k] = `[Array:${v.length}]`;
        else if (v && v.name && v.path) safe[k] = '[file]';
        else safe[k] = '[object]';
      } catch (e) {
        safe[k] = '[unserializable]';
      }
    });
    console.log('req.body snapshot:', JSON.stringify(safe));
  } catch (e) {
    console.warn('Failed to log req.body snapshot', e);
  }

  // Normalize fields from multipart forms (e.g. fields named "Listing[category]")
  // into a nested `req.body.Listing` object so Joi schema matches correctly.
  if (!req.body.Listing) {
    const listingObj = {};
    const known = ['title','description','price','location','country','category'];
    Object.keys(req.body).forEach((k) => {
      // bracket notation: Listing[category]
      let m = k.match(/^Listing\[(.+)\]$/);
      if (m) {
        listingObj[m[1]] = req.body[k];
        return;
      }
      // dot notation: Listing.category
      m = k.match(/^Listing\.(.+)$/);
      if (m) {
        listingObj[m[1]] = req.body[k];
        return;
      }
      // also accept top-level known fields (e.g., name="category" or name="title")
      if (known.includes(k) || k === 'Listing_category') {
        listingObj[k === 'Listing_category' ? 'category' : k] = req.body[k];
      }
    });
    if (Object.keys(listingObj).length > 0) req.body.Listing = listingObj;
  }

  // Extra safety: if Listing exists but category is missing, try direct keys
  if (req.body.Listing && !req.body.Listing.category) {
    if (req.body['Listing[category]']) req.body.Listing.category = req.body['Listing[category]'];
    else if (req.body['Listing.category']) req.body.Listing.category = req.body['Listing.category'];
    else if (req.body.category) req.body.Listing.category = req.body.category;
  }

  // Joi validates either nested Listing or top-level fields
  // Controller will normalize and ensure required fields before DB save
  const { error } = listingSchema.validate(req.body);
  if (error) {
    console.warn('Joi validation error:', error.details.map(d => d.message).join('; '));
    const msg = error.details.map((el) => el.message).join(", ");
    throw new ExpressError(400, msg);
  }
  next();
};

// ---------------- ROUTES ----------------

// INDEX: List all listings
router.get("/", wrapAsync(listingsController.index));

// NEW: Render form to create new listing
router.get("/new", isLoggedIn, listingsController.renderNewForm);

// CREATE: Add new listing
router.post(
  "/",
  isLoggedIn,
  upload.single("image"),
  validateListing,
  wrapAsync(listingsController.postListing)
);

// EDIT: Render edit form (ownership check) - MUST BE BEFORE /:id route
router.get(
  "/:id/edit",
  isLoggedIn,
  isOwner,
  wrapAsync(listingsController.editListing)
);

// SHOW, UPDATE, DELETE (with ownership check)
router
  .route("/:id")
  .get(wrapAsync(listingsController.showListing))
  .put(
    isLoggedIn,
    isOwner,
    upload.single("image"),
    validateListing,
    wrapAsync(listingsController.updateListing)
  )
  .delete(
    isLoggedIn,
    isOwner,
    wrapAsync(listingsController.deleteListing)
  );

module.exports = router;
