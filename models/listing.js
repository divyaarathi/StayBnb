const mongoose = require('mongoose');
const Review = require('./review.js');

const Schema = mongoose.Schema;

const listSchema = new Schema({
  title: {
    type: String,
    required: true,
  },

  description: {
    type: String,
    required: true,
  },

  // ✅ SINGLE IMAGE (Cloudinary)
  image: {
    url: String,
    filename: String
  },

  price: Number,

  location: String,

  country: String,

  reviews: [
    {
      type: Schema.Types.ObjectId,
      ref: "Review"
    }
  ],

  owner: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true
  },

  // 🌍 Mapbox / GeoJSON
  geometry: {
    type: {
      type: String,
      enum: ['Point'],
      required: true
    },
    coordinates: {
      type: [Number], // [lng, lat]
      required: true
    }
  },

  category: {
    type: String,
    enum: [
      "trending", "beach", "room", "dome", "castle",
      "camping", "boat", "pool", "mountain",
      "iconic-cities", "farm", "arctic"
    ],
    default: "trending"
  }
});

// ✅ Leaflet helper
listSchema.virtual('latlng').get(function () {
  if (this.geometry && this.geometry.coordinates) {
    return [this.geometry.coordinates[1], this.geometry.coordinates[0]];
  }
  return null;
});

// ✅ Delete reviews when listing deleted
listSchema.post('findOneAndDelete', async (listing) => {
  if (listing) {
    await Review.deleteMany({ _id: { $in: listing.reviews } });
  }
});

module.exports = mongoose.model('Listing', listSchema);
