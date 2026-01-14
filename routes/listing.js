// StayBnb/routes/listing.js
const express = require("express");
const router = express.Router();
const multer = require('multer');

const wrapAsync = require("../utils/wrapAsync.js");
const ExpressError = require("../utils/ExpressError.js");
const { listingSchema } = require("../schema.js");
const { isLoggedIn, isOwner } = require("../middleware.js");
const listingsController = require("../controllers/listings.js");

// Cloudinary setup
const { storage } = require("../cloudinaryStorage"); // <-- correct path
const upload = multer({ storage });

// ---------------- MIDDLEWARE ----------------

// Validate Listing Input
const validateListing = (req, res, next) => {
  if (!req.body.Listing) {
    const listingObj = {};
    const known = ["title", "description", "price", "location", "country", "category"];

    Object.keys(req.body).forEach((key) => {
      let match = key.match(/^Listing\[(.+)\]$/);
      if (match) {
        listingObj[match[1]] = req.body[key];
        return;
      }
      match = key.match(/^Listing\.(.+)$/);
      if (match) {
        listingObj[match[1]] = req.body[key];
        return;
      }
      if (known.includes(key)) listingObj[key] = req.body[key];
    });

    if (Object.keys(listingObj).length > 0) req.body.Listing = listingObj;
  }

  if (req.body.Listing && !req.body.Listing.category) {
    if (req.body["Listing[category]"]) req.body.Listing.category = req.body["Listing[category]"];
    else if (req.body.category) req.body.Listing.category = req.body.category;
  }

  const { error } = listingSchema.validate(req.body);
  if (error) {
    const msg = error.details.map(el => el.message).join(", ");
    throw new ExpressError(400, msg);
  }

  next();
};

// ---------------- ROUTES ----------------

// INDEX – show all listings
router.get("/", wrapAsync(listingsController.index));

// NEW – form
router.get("/new", isLoggedIn, listingsController.renderNewForm);

// CREATE – add listing (Cloudinary upload)
router.post(
  "/",
  isLoggedIn,
  upload.single("image"),
  wrapAsync(async (req, res) => {
    const listing = new Listing(req.body.listing);

    // Only assign image if a file was uploaded. Use fallback for different
    // Cloudinary field names (`path`, `secure_url`, `url`).
    if (req.file) {
      const url = req.file.path || req.file.secure_url || req.file.url || null;
      const filename = req.file.filename || null;
      listing.image = { url, filename };
    }

    await listing.save();
    res.redirect("/listings");
  })
);


// EDIT – form
router.get("/:id/edit", isLoggedIn, isOwner, wrapAsync(listingsController.editListing));

// SHOW, UPDATE, DELETE
router
  .route("/:id")
  .get(wrapAsync(listingsController.showListing))
  .put(
    isLoggedIn,
    isOwner,
    upload.single("image"), // ✅ Cloudinary image upload
    validateListing,
    wrapAsync(listingsController.updateListing)
  )
  .delete(isLoggedIn, isOwner, wrapAsync(listingsController.deleteListing));

module.exports = router;
