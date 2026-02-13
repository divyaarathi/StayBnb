const mongoose = require("mongoose");
const Listing = require("../models/listing");
const mbxGeocoding = require("@mapbox/mapbox-sdk/services/geocoding");

const geocodingClient = mbxGeocoding({
  accessToken: process.env.MAPBOX_TOKEN,
});

// ---------------- NEW LISTING FORM ----------------
module.exports.renderNewForm = (req, res) => {
  res.render("listings/new");
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

  res.render("listings/show", { listing, currUser: req.user });
};

// ---------------- CREATE LISTING ----------------
module.exports.postListing = async (req, res) => {
  try {
    const listingData = req.body.Listing;

    if (!listingData?.category) {
      req.flash("error", "Category is required.");
      return res.redirect("back");
    }

    // 🌍 Geocoding
    const geoResponse = await geocodingClient
      .forwardGeocode({
        query: `${listingData.location}, ${listingData.country}`,
        limit: 1,
      })
      .send();

    const listing = new Listing(listingData);

    // ✅ SINGLE IMAGE (SAFE)
    if (req.file) {
      listing.image = {
        url: req.file.path,
        filename: req.file.filename,
      };
    } else {
      // Default placeholder if no image uploaded
      listing.image = {
        url: "/images/placeholder.png",
        filename: "placeholder"
      };
    }

    listing.owner = req.user._id;

    listing.geometry =
      geoResponse.body?.features?.[0]?.geometry || {
        type: "Point",
        coordinates: [0, 0],
      };

    await listing.save();

    req.flash("success", "Listing created!");
    res.redirect(`/listings/${listing._id}`);
  } catch (err) {
    console.error(err);
    req.flash("error", "Failed to create listing.");
    res.redirect("/listings/new");
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

  // Determine a safe original image URL to show in the edit form
  let originalImage = "/images/placeholder.png";
  if (typeof listing.image === "string") {
    originalImage = listing.image;
  } else if (listing.image && listing.image.url) {
    originalImage = listing.image.url;
  }

  res.render("listings/edit", { listing, originalImage, currUser: req.user });
};

// ---------------- UPDATE LISTING ----------------
module.exports.updateListing = async (req, res) => {
  const { id } = req.params;

  try {
    const listing = await Listing.findById(id);
    if (!listing) {
      req.flash("error", "Listing not found.");
      return res.redirect("/listings");
    }

    // Update text fields
    Object.assign(listing, req.body.Listing);

    // ✅ SINGLE IMAGE UPDATE (SAFE)
    if (req.file) {
      listing.image = {
        url: req.file.path,
        filename: req.file.filename,
      };
    }

    // 🌍 Update map location
    if (req.body.Listing?.location && req.body.Listing?.country) {
      const geoResponse = await geocodingClient
        .forwardGeocode({
          query: `${req.body.Listing.location}, ${req.body.Listing.country}`,
          limit: 1,
        })
        .send();

      listing.geometry =
        geoResponse.body?.features?.[0]?.geometry || listing.geometry;
    }

    await listing.save();

    req.flash("success", "Listing updated!");
    res.redirect(`/listings/${id}`);
  } catch (err) {
    console.error(err);
    req.flash("error", "Update failed.");
    res.redirect("back");
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
  res.redirect("/listings");
};

// ---------------- INDEX ----------------
module.exports.index = async (req, res) => {
  try {
    // Allow filtering by category via query param, e.g. /listings?category=room
    const { category } = req.query;
    let query = {};
    if (category && category !== "all") {
      query.category = category;
    }

    const allLists = await Listing.find(query).populate("owner");
    res.render("listings/index", {
      allLists,
      currUser: req.user,
      selectedCategory: category || "all",
    });
  } catch (err) {
    console.error(err);
    req.flash("error", "Server error");
    res.redirect("/");
  }
};
