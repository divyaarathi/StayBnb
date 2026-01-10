const Review = require("../models/review");
const Listing = require("../models/listing");

module.exports.postReview = async (req, res) => {
    const { listingId } = req.params;
    const listing = await Listing.findById(listingId);
    if (!listing) {
        req.flash('error', 'Listing not found.');
        return res.redirect('/listings');
    }

    const newReview = new Review(req.body.review);
    newReview.author = req.user._id;

    await newReview.save();
    listing.reviews.push(newReview._id);
    await listing.save();

    req.flash('success', 'Review added successfully!');
    // If the request expects JSON (AJAX), respond with the new review id and data
    const wantsJson = req.xhr || (req.headers.accept && req.headers.accept.indexOf('application/json') !== -1);
    if (wantsJson) {
        return res.json({
            success: true,
            reviewId: newReview._id,
            author: req.user.username,
            rating: newReview.rating,
            comment: newReview.comment
        });
    }

    return res.redirect(`/listings/${listing._id}`);
};

module.exports.destroyReview = async (req, res) => {
    const { listingId, reviewId } = req.params;
    const listing = await Listing.findById(listingId);
    if (!listing) {
        req.flash('error', 'Listing not found.');
        return res.redirect('/listings');
    }

    await Listing.findByIdAndUpdate(listingId, { $pull: { reviews: reviewId } });
    await Review.findByIdAndDelete(reviewId);
    req.flash('success', 'Review Deleted!');
    res.redirect(`/listings/${listingId}`);
};