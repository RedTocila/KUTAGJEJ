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
    /** Monday=0 … Sunday=6; when set, drives open/closed status and openingHours summary. */
    weeklyHours: [
      {
        dayOfWeek: { type: Number, min: 0, max: 6 },
        closed: { type: Boolean, default: false },
        open: { type: String, trim: true, default: null },
        close: { type: String, trim: true, default: null },
      },
    ],
    menuCategories: [
      {
        id: { type: String, required: true },
        name: { type: String, required: true, trim: true },
        sortOrder: { type: Number, default: 0 },
      },
    ],
    menuItems: [
      {
        id: { type: String, required: true },
        categoryId: { type: String, required: true },
        name: { type: String, required: true, trim: true },
        description: { type: String, trim: true, default: '' },
        price: { type: Number, required: true, min: 0 },
        currency: { type: String, enum: ['EUR', 'LEK'], default: 'EUR' },
        imageUrl: { type: String, trim: true, default: null },
        sortOrder: { type: Number, default: 0 },
      },
    ],
    reservationsEnabled: { type: Boolean, default: false },
    reservationUrl: { type: String, trim: true, default: null },
    reservationTimeSlots: [{ type: String, trim: true }],
    reservationPartySizes: [{ type: Number }],
    /** Short line of what the venue offers (e.g. brunch, kokteje, muzikë live). */
    servicesHighlight: { type: String, trim: true, default: null },

    /** Profesionistë: typical response time in hours (shown as "Brenda X orësh"). */
    responseTimeHours: { type: Number, min: 1, max: 168, default: null },
    portfolioItems: [
      {
        id: { type: String, required: true },
        title: { type: String, required: true, trim: true },
        description: { type: String, trim: true, default: '' },
        imageUrl: { type: String, trim: true, required: true },
        location: { type: String, trim: true, default: null },
        sortOrder: { type: Number, default: 0 },
      },
    ],

    cityId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
    contactPhone: { type: String, trim: true },
    imageUrls: [{ type: String, trim: true }],
  },
  { timestamps: true },
);

module.exports = mongoose.model('DirectoryListing', directoryListingSchema);
