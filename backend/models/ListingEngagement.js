const mongoose = require('mongoose');

const listingEngagementSchema = new mongoose.Schema(
  {
    listingKind: {
      type: String,
      enum: ['real-estate', 'car', 'job', 'marketplace', 'businesses', 'professionals'],
      required: true,
    },
    listingId: { type: mongoose.Schema.Types.ObjectId, required: true },
    viewCount: { type: Number, default: 0, min: 0 },
    clickCount: { type: Number, default: 0, min: 0 },
    shareCount: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true },
);

listingEngagementSchema.index({ listingKind: 1, listingId: 1 }, { unique: true });
listingEngagementSchema.index({ listingKind: 1, viewCount: -1 });

module.exports = mongoose.model('ListingEngagement', listingEngagementSchema);
