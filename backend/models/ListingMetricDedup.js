const mongoose = require('mongoose');

/** Prevents inflating view/click counts from the same visitor in a short window. */
const listingMetricDedupSchema = new mongoose.Schema(
  {
    listingKind: { type: String, required: true },
    listingId: { type: mongoose.Schema.Types.ObjectId, required: true },
    visitorKey: { type: String, required: true, trim: true },
    eventType: { type: String, enum: ['view', 'click'], required: true },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true },
);

listingMetricDedupSchema.index(
  { listingKind: 1, listingId: 1, visitorKey: 1, eventType: 1 },
  { unique: true },
);
listingMetricDedupSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('ListingMetricDedup', listingMetricDedupSchema);
