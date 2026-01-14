const mongoose = require("mongoose");
const Listing = require("../models/listing");
const mbxGeocoding = require("@mapbox/mapbox-sdk/services/geocoding");
require("dotenv").config();

const geocodingClient = mbxGeocoding({
  accessToken: process.env.MAPBOX_TOKEN,
});

// ---------------- NEW LISTING FORM ----------------
module.exports.renderNewForm = (req, res) => {
  return res.render("listings/new");
};

// ---------------- SHOW LISTING ----------------
module.exports.showListing = async (req, res) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    req.flash("error", "Invalid listing ID.");
    return res.redirect("/listings");
  }

  const listing = await Listing.findById(id)
    .populate("owner")
    .populate({ path: "reviews", populate: { path: "author" } });

  if (!listing) {
    req.flash("error", "Listing does not exist!");
    return res.redirect("/listings");
  }

  return res.render("listings/show", { listing, currUser: req.user });
};

// ---------------- CREATE LISTING ----------------
module.exports.postListing = async (req, res) => {
  try {
    const listingData = req.body.Listing;
    if (!listingData || !listingData.category) {
      req.flash("error", "Category is required.");
      return res.redirect("back");
    }

    const geoResponse = await geocodingClient
      .forwardGeocode({
        query: `${listingData.location}, ${listingData.country}`,
        limit: 1,
      })
      .send();

    const listing = new Listing(listingData);

    if (req.file) {
      listing.image = {
        url: req.file.path,
        filename: req.file.filename,
      };
    }

    listing.owner = req.user._id;
    listing.geometry =
      geoResponse.body.features[0]?.geometry || {
        type: "Point",
        coordinates: [0, 0],
      };

    await listing.save();

    req.flash("success", "Listing created!");
    return res.redirect("/listings");
  } catch (err) {
    console.error(err);
    req.flash("error", "Failed to create listing.");
    return res.redirect("/listings/new");
  }
};

// ---------------- EDIT FORM ----------------
module.exports.editListing = async (req, res) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    req.flash("error", "Invalid listing ID");
    return res.redirect("/listings");
  }

  const listing = await Listing.findById(id);
  if (!listing) {
    req.flash("error", "Listing not found");
    return res.redirect("/listings");
  }

  return res.render("listings/edit", { listing });
};

// ---------------- UPDATE LISTING ----------------
module.exports.updateListing = async (req, res) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    req.flash("error", "Invalid listing ID.");
    return res.redirect("/listings");
  }

  try {
    const listing = await Listing.findById(id);
    if (!listing) {
      req.flash("error", "Listing not found.");
      return res.redirect("/listings");
    }

    Object.assign(listing, req.body.Listing);

    if (req.file) {
      listing.image = {
        url: req.file.path,
        filename: req.file.filename,
      };
    }

    await listing.save();
    req.flash("success", "Listing updated!");
    return res.redirect(`/listings/${id}`);
  } catch (err) {
    console.error(err);
    req.flash("error", "Update failed.");
    return res.redirect("back");
  }
};

// ---------------- DELETE LISTING ----------------
module.exports.deleteListing = async (req, res) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    req.flash("error", "Invalid listing ID.");
    return res.redirect("/listings");
  }

  await Listing.findByIdAndDelete(id);
  req.flash("success", "Listing deleted!");
  return res.redirect("/listings");
};

// ---------------- INDEX ----------------
module.exports.index = async (req, res) => {
  try {
    const allLists = await Listing.find({}).populate("owner");
    return res.render("listings/index", {
      allLists,
      currUser: req.user,
    });
  } catch (err) {
    console.error(err);
    req.flash("error", "Server error");
    return res.redirect("/");
  }
};
