const mongoose = require('mongoose');

const savedListingSchema = new mongoose.Schema(
  {
    saverId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
    saverModel: { type: String, enum: ['IndividualUser', 'BusinessUser'], required: true },
    listingKind: {
      type: String,
      enum: ['real-estate', 'car', 'job', 'marketplace', 'businesses', 'professionals'],
      required: true,
    },
    listingId: { type: mongoose.Schema.Types.ObjectId, required: true },
  },
  { timestamps: true },
);

savedListingSchema.index({ saverModel: 1, saverId: 1, listingKind: 1, listingId: 1 }, { unique: true });
savedListingSchema.index({ listingKind: 1, listingId: 1 });

module.exports = mongoose.model('SavedListing', savedListingSchema);
