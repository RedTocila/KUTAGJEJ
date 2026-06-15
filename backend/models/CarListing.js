const mongoose = require('mongoose');
const { listingModerationFields } = require('../lib/listing-moderation-fields');

const carListingSchema = new mongoose.Schema(
  {
    posterId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
    posterModel: { type: String, enum: ['IndividualUser', 'BusinessUser'], required: true },

    make: { type: String, required: true, trim: true },
    model: { type: String, required: true, trim: true },
    /** e.g. "Sportback", "S-Line", "Competition" — appended to the listing title */
    variant: { type: String, trim: true, default: '' },
    description: { type: String, required: true, trim: true },

    year: { type: Number, required: true },
    kilometers: { type: Number, required: true, min: 0 },
    transmission: { type: String, enum: ['automatic', 'manual'], required: true },
    fuelType: {
      type: String,
      enum: [
        'petrol',
        'diesel',
        'electric',
        'ethanol',
        'hybrid-diesel',
        'hybrid-petrol',
        'hydrogen',
        'lpg',
        'natural-gas',
        'plugin-hybrid',
        'other',
      ],
      required: true,
    },

    price: { type: Number, required: true, min: 0 },
    currency: { type: String, enum: ['EUR', 'LEK'], required: true },

    color: { type: String, required: true, trim: true, lowercase: true },
    /** Optional finish modifiers: "matte", "metallic" */
    finish: [{ type: String, enum: ['matte', 'metallic'] }],

    extras: [{ type: String, trim: true }],

    contactPhone: { type: String, trim: true },

    /** City the car is listed in (references the shared RealEstateCity collection). */
    cityId: { type: mongoose.Schema.Types.ObjectId, index: true },

    /** Vercel Blob URLs of uploaded images (up to 5). */
    imageUrls: [{ type: String, trim: true }],
    ...listingModerationFields,
  },
  { timestamps: true },
);

module.exports = mongoose.model('CarListing', carListingSchema);
