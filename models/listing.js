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
    image: {
        url: String,
        filename: String
    },
    price: {
        type: Number,
    },
    location: {
        type: String,
    },
    country: {
        type: String,
    },
    reviews: [
        {
            type: Schema.Types.ObjectId,
            ref: "Review"
        }
    ],
   owner: {
  type: mongoose.Schema.Types.ObjectId,
  ref: "User",
  required: true
},

    geometry: {
        type: {
            type: String,
            enum: ['Point'], // GeoJSON type must be "Point"
            required: true
        },
        coordinates: {
            type: [Number], // [longitude, latitude]
            required: true
        }
    },
    category: {
        type: String,
        enum: [
            "trending","beach","room","dome","castle","camping","boat",
            "pool","mountain","iconic-cities","farm","arctic"
        ],
        required: true,
        default: 'trending'
    }
});

// Virtual property to get [lat, lng] for Leaflet maps
listSchema.virtual('latlng').get(function() {
    if (this.geometry && this.geometry.coordinates) {
        return [this.geometry.coordinates[1], this.geometry.coordinates[0]]; // [lat, lng]
    }
    return null;
});

// Middleware: delete all reviews when a listing is deleted
listSchema.post('findOneAndDelete', async (listing) => {
    if (listing) {
        await Review.deleteMany({ _id: { $in: listing.reviews } });
    }
});

const Listing = mongoose.model('Listing', listSchema);

module.exports = Listing;
