const express = require("express");
const router = express.Router({ mergeParams: true });
const wrapAsync = require("../utils/wrapAsync.js");
const Review = require("../models/review.js");
const Listing = require("../models/listing.js");
const { isLoggedIn, validateReview, isReviewAuthor } = require("../middleware.js");
const reviewsController = require("../controllers/reviews.js");

// REVIEW
router.post(
  "/",
  isLoggedIn,
  validateReview,
  wrapAsync(reviewsController.postReview)
);

// REVIEW DELETE
router.delete(
  "/:reviewId",
  isLoggedIn,
  isReviewAuthor,
  wrapAsync(reviewsController.destroyReview)
);

module.exports = router;