const mongoose = require('mongoose');

const adminNotificationSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ['listing_submitted', 'job_employer_verification', 'professional_verification'],
      required: true,
      index: true,
    },
    /** Listing kind: real-estate, cars, jobs, marketplace, businesses, professionals */
    refKind: { type: String, trim: true, default: '' },
    refId: { type: mongoose.Schema.Types.ObjectId, default: null },
    title: { type: String, trim: true, required: true },
    message: { type: String, trim: true, default: '' },
    readAt: { type: Date, default: null, index: true },
  },
  { timestamps: true },
);

adminNotificationSchema.index({ createdAt: -1 });

module.exports = mongoose.model('AdminNotification', adminNotificationSchema);
