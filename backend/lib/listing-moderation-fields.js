const mongoose = require('mongoose');

/** Shared moderation fields for all public listing models. */
const listingModerationFields = {
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending',
    index: true,
  },
  reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', default: null },
  reviewedAt: { type: Date, default: null },
  adminNote: { type: String, trim: true, default: '' },
};

const LISTING_STATUSES = ['pending', 'approved', 'rejected'];

const PUBLIC_LISTING_STATUS_FILTER = { status: 'approved' };

module.exports = {
  listingModerationFields,
  LISTING_STATUSES,
  PUBLIC_LISTING_STATUS_FILTER,
};
