// StayBnb/routes/listing.js
const express = require("express");
const router = express.Router();
const multer = require("multer");

const wrapAsync = require("../utils/wrapAsync.js");
const ExpressError = require("../utils/ExpressError.js");
const { listingSchema } = require("../schema.js");
const { isLoggedIn, isOwner } = require("../middleware.js");
const listingsController = require("../controllers/listings.js");

// Cloudinary setup
const { storage } = require("../cloudinaryStorage");
const upload = multer({ storage });

/* ================= MIDDLEWARE ================= */

// Validate Listing Input
const validateListing = (req, res, next) => {
  // Normalize form data if Listing object is missing
  if (!req.body.Listing) {
    const listingObj = {};
    const known = [
      "title",
      "description",
      "price",
      "location",
      "country",
      "category",
    ];

    for (let key in req.body) {
      let match = key.match(/^Listing\[(.+)\]$/);
      if (match) {
        listingObj[match[1]] = req.body[key];
        continue;
      }

      match = key.match(/^Listing\.(.+)$/);
      if (match) {
        listingObj[match[1]] = req.body[key];
        continue;
      }

      if (known.includes(key)) {
        listingObj[key] = req.body[key];
      }
    }

    if (Object.keys(listingObj).length > 0) {
      req.body.Listing = listingObj;
    }
  }

  // Ensure category exists
  if (req.body.Listing && !req.body.Listing.category) {
    if (req.body["Listing[category]"]) {
      req.body.Listing.category = req.body["Listing[category]"];
    } else if (req.body.category) {
      req.body.Listing.category = req.body.category;
    }
  }

  const { error } = listingSchema.validate(req.body);
  if (error) {
    const msg = error.details.map((el) => el.message).join(", ");
    throw new ExpressError(400, msg);
  }

  next();
};

/* ================= ROUTES ================= */

// INDEX – show all listings
router.get("/", wrapAsync(listingsController.index));

// NEW – show form
router.get("/new", isLoggedIn, listingsController.renderNewForm);

// CREATE – add listing (Cloudinary upload)
router.post(
  "/",
  isLoggedIn,
  upload.single("image"), // req.file may be undefined → controller must handle it
  validateListing,
  wrapAsync(listingsController.postListing)
);

// EDIT – form
router.get(
  "/:id/edit",
  isLoggedIn,
  isOwner,
  wrapAsync(listingsController.editListing)
);

// SHOW / UPDATE / DELETE
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
