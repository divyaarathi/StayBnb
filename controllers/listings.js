// controllers/listings.js
const mongoose = require("mongoose"); //  Needed for ObjectId validation
const Listing = require("../models/listing");
const mbxGeocoding = require("@mapbox/mapbox-sdk/services/geocoding");
const dotenv = require("dotenv");
dotenv.config();

const mapToken = process.env.MAPBOX_TOKEN;
const geocodingClient = mbxGeocoding({ accessToken: mapToken });

// ---------------- RENDER NEW LISTING FORM ----------------
module.exports.renderNewForm = (req, res) => {
  res.render("listings/new.ejs");
};

// ---------------- SHOW A LISTING ----------------
module.exports.showListing = async (req, res) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    req.flash("error", "Invalid listing ID.");
    return res.redirect("/listings");
  }

  const listing = await Listing.findById(id)
    .populate("owner")
    .populate({
      path: "reviews",
      populate: { path: "author" },
    });

  if (!listing) {
    req.flash("error", "Listing does not exist!");
    return res.redirect("/listings");
  }

  res.render("listings/show.ejs", { listing, currUser: req.user });
};

// ---------------- CREATE (POST) NEW LISTING ----------------
module.exports.postListing = async (req, res) => {
  try {
   
    // Normalize listing fields in case multipart/form-data produced flat keys like "Listing[category]"
    if (!req.body.Listing) {
      const listingObj = {};
      const known = ['title','description','price','location','country','category'];
      Object.keys(req.body).forEach((k) => {
        const m = k.match(/^Listing\[(.+)\]$/) || k.match(/^Listing\.(.+)$/);
        if (m) listingObj[m[1]] = req.body[k];
        // accept top-level keys too (from new/edit forms)
        if (known.includes(k)) listingObj[k] = req.body[k];
      });
      if (Object.keys(listingObj).length > 0) req.body.Listing = listingObj;
    }

    const { Listing: listingData } = req.body;

    // Debug log for missing category
    if (!listingData || !listingData.category) {
      console.warn('postListing: category missing in incoming data. req.body keys:', Object.keys(req.body));
      console.warn('postListing: constructed Listing:', JSON.stringify(req.body.Listing || {}));
      req.flash('error', 'Category is required. Please select a category.');
      return res.redirect('back');
    }
    const geoResponse = await geocodingClient
      .forwardGeocode({
        query: `${listingData.location}, ${listingData.country}`,
        limit: 1,
      })
      .send();

    const listing = new Listing(listingData);

    // Assign uploaded image
    if (req.file) {
      const { path: url, filename } = req.file;
      listing.image = { url, filename };
    }

    // Assign logged-in user as owner
    listing.owner = req.user._id;

    // Assign coordinates
    listing.geometry =
      geoResponse.body.features.length > 0
        ? geoResponse.body.features[0].geometry
        : { type: "Point", coordinates: [0, 0] };

    await listing.save();

    req.flash("success", "Listing created successfully!");
    res.redirect("/listings");
  } catch (err) {
    console.error(err);
    req.flash("error", "Failed to create listing.");
    res.redirect("/listings/new");
  }
};

// ---------------- EDIT LISTING PAGE ----------------
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

  // Pass the image or fallback
  const originalImage = listing.image
    ? listing.image.url
    : "/images/placeholder.png";

  //  Pass only what EJS needs — no redundant listingId
  res.render("listings/edit", { listing, originalImage });
};

// ---------------- UPDATE LISTING ----------------
module.exports.updateListing = async (req, res) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    req.flash("error", "Invalid listing ID.");
    return res.redirect("/listings");
  }

  try {
    // Load existing listing so we can preserve fields that may be omitted in the form
    const existing = await Listing.findById(id);
    if (!existing) {
      req.flash("error", "Listing not found.");
      return res.redirect("/listings");
    }

    // Normalize incoming listing fields if needed
    if (!req.body.Listing) {
      const listingObj = {};
      const known = ['title','description','price','location','country','category'];
      Object.keys(req.body).forEach((k) => {
        const m = k.match(/^Listing\[(.+)\]$/) || k.match(/^Listing\.(.+)$/);
        if (m) listingObj[m[1]] = req.body[k];
        if (known.includes(k)) listingObj[k] = req.body[k];
      });
      if (Object.keys(listingObj).length > 0) req.body.Listing = listingObj;
    }

    // Build update data and preserve category from existing if omitted
    let updateData = { ...(req.body.Listing || {}) };

    // Extra fallback: copy category from top-level if Listing normalization missed it
    if (!updateData.category && req.body.category) {
      updateData.category = req.body.category;
      console.info('updateListing: recovered category from req.body.category:', req.body.category);
    }

    // Preserve existing category if still missing
    if (!updateData.category && existing.category) {
      updateData.category = existing.category;
      console.info('updateListing: preserved existing category:', existing.category);
    }

    // Log when category is still missing for debugging
    if (!updateData.category) {
      console.error('updateListing: FINAL updateData missing category!');
      console.error('updateListing: req.body keys:', Object.keys(req.body));
      console.error('updateListing: req.body:', JSON.stringify(req.body, null, 2));
      console.error('updateListing: req.body.Listing:', JSON.stringify(req.body.Listing || {}, null, 2));
      console.error('updateListing: existing.category:', existing.category);
      req.flash('error', 'Category is required. Please select a category.');
      return res.redirect('back');
    }

    console.info('updateListing: final updateData:', JSON.stringify(updateData, null, 2));

    // Apply updates to the fetched document and save so Mongoose validators run
    let listing = existing;
    Object.assign(listing, updateData);
    try {
      await listing.save();
    } catch (saveErr) {
      console.error('Listing.save() validation error:', saveErr);
      throw saveErr;
    }

    // Update image if uploaded
    if (req.file) {
      const { path: url, filename } = req.file;
      listing.image = { url, filename };
      await listing.save();
    }

    // Update location & geometry if changed
    if (updateData.location && updateData.country) {
      const geoResponse = await geocodingClient
        .forwardGeocode({
          query: `${updateData.location}, ${updateData.country}`,
          limit: 1,
        })
        .send();

      if (geoResponse.body.features.length > 0) {
        listing.geometry = geoResponse.body.features[0].geometry;
        await listing.save();
      }
    }

    req.flash("success", "Listing updated!");
    return res.redirect(`/listings/${id}`);
  } catch (err) {
    console.error('updateListing error:', err);
    req.flash('error', 'Failed to update listing. ' + (err.message || ''));
    return res.redirect('back');
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

// ---------------- INDEX (LISTINGS PAGE WITH FILTERS) ----------------
module.exports.index = async (req, res) => {
  try {
    let query = {};

    // Filter by category
    if (req.query.category && req.query.category.trim() !== "") {
      query.category = req.query.category;
    }

    // Handle search
    if (req.query.search && req.query.search.trim() !== "") {
      const searchTerm = req.query.search.trim();
      const rangeMatch = searchTerm.match(/^(\d+)-(\d+)$/);

      if (rangeMatch) {
        query.price = {
          $gte: Number(rangeMatch[1]),
          $lte: Number(rangeMatch[2]),
        };
      } else if (!isNaN(searchTerm)) {
        query.price = Number(searchTerm);
      } else {
        const regex = new RegExp(searchTerm, "i");
        query.$or = [
          { title: regex },
          { category: regex },
          { location: regex },
          { country: regex },
        ];
      }
    }

    const allLists = await Listing.find(query).populate("owner");

    if (!allLists || allLists.length === 0) {
      req.flash("error", "No listings found for your search.");
      return res.redirect("/listings");
    }

    res.render("listings/index", {
      allLists,
      messages: req.flash(),
      req,
      currUser: req.user,
    });
  } catch (err) {
    console.error(err);
    req.flash("error", "Server error occurred.");
    res.redirect("/listings");
  }
};
