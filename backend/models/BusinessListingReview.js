const mongoose = require('mongoose');

const businessListingReviewSchema = new mongoose.Schema(
  {
    listingId: { type: mongoose.Schema.Types.ObjectId, ref: 'DirectoryListing', required: true, index: true },
    reviewerId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
    reviewerModel: { type: String, enum: ['IndividualUser', 'BusinessUser'], required: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, trim: true, default: '', maxlength: 2000 },
  },
  { timestamps: true },
);

businessListingReviewSchema.index(
  { listingId: 1, reviewerId: 1, reviewerModel: 1 },
  { unique: true },
);

module.exports = mongoose.model('BusinessListingReview', businessListingReviewSchema);
