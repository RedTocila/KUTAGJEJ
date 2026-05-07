const mongoose = require('mongoose');

/**
 * Unified model for "Biznese" and "Profesionistë" public verticals.
 * Same general shape as marketplace listings for card compatibility.
 */
const directoryListingSchema = new mongoose.Schema(
  {
    vertical: {
      type: String,
      enum: ['businesses', 'professionals'],
      required: true,
      index: true,
    },
    posterId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
    posterModel: { type: String, enum: ['IndividualUser', 'BusinessUser'], required: true },

    title: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    /** Slug aligning with admin listing types (venue type for businesses, service type for professionals). */
    category: { type: String, required: true, trim: true },
    condition: { type: String, trim: true, default: null },

    price: { type: Number, default: null },
    currency: { type: String, enum: ['EUR', 'LEK', null], default: null },

    /** Biznese (venues): profile fields — not property listings. */
    openingHours: { type: String, trim: true, default: null },
    reservationsEnabled: { type: Boolean, default: false },
    reservationUrl: { type: String, trim: true, default: null },
    /** Short line of what the venue offers (e.g. brunch, kokteje, muzikë live). */
    servicesHighlight: { type: String, trim: true, default: null },

    cityId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
    contactPhone: { type: String, trim: true },
    imageUrls: [{ type: String, trim: true }],
  },
  { timestamps: true },
);

module.exports = mongoose.model('DirectoryListing', directoryListingSchema);
