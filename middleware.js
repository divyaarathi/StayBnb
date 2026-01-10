
const Listing = require("./models/listing.js");
const Review = require("./models/review.js");
const ExpressError = require("./utils/ExpressError.js");
const { reviewSchema } = require("./schema.js");

// ------------------- Check if user is logged in -------------------
module.exports.isLoggedIn = (req, res, next) => {
  if (!req.isAuthenticated()) {
    req.session.redirectUrl = req.originalUrl;
    req.flash("error", "You must be logged in first!");
    return res.redirect("/login");
  }
  next();
};

// ------------------- Save redirect URL after login -------------------
module.exports.saveRedirect = (req, res, next) => {
  if (req.session.redirectUrl) {
    res.locals.redirectUrl = req.session.redirectUrl;
  }
  next();
};

// ------------------- Check if logged-in user is the owner -------------------
module.exports.isOwner = async (req, res, next) => {
  const { id } = req.params;

  const listing = await Listing.findById(id).populate("owner"); //  add populate

  if (!listing) {
    req.flash("error", "Listing not found!");
    return res.redirect("/listings");
  }

  // If the listing has no owner, assign the current logged-in user as owner
  // This allows editing/updating orphaned listings while keeping a safe record.
  if (!listing.owner) {
    console.warn(`Listing ${id} has no owner set. Assigning current user as owner.`);
    listing.owner = req.user._id;
    await listing.save();
  }

  const ownerId = listing.owner._id ? listing.owner._id.toString() : listing.owner.toString();
  const userId = req.user._id.toString();

  console.log("Listing owner ID:", ownerId);
  console.log("Logged-in user ID:", userId);

  if (ownerId !== userId) {
    req.flash("error", "You don't have permission!");
    return res.redirect(`/listings/${id}`);
  }

  next();
};

// ------------------- Validate review input -------------------
module.exports.validateReview = (req, res, next) => {
  const { error } = reviewSchema.validate(req.body);
  if (error) {
    throw new ExpressError(400, error.details.map(el => el.message).join(", "));
  }
  next();
};

// ------------------- Check if logged-in user is review author -------------------
module.exports.isReviewAuthor = async (req, res, next) => {
  const { id, reviewId } = req.params;
  const review = await Review.findById(reviewId);

  if (!review) {
    req.flash("error", "Review not found!");
    return res.redirect(`/listings/${id}`);
  }

  const authorId = review.author._id ? review.author._id.toString() : review.author.toString();
  const userId = req.user._id.toString();

  if (authorId !== userId) {
    req.flash("error", "You are not the author of this review!");
    return res.redirect(`/listings/${id}`);
  }

  next();
};
