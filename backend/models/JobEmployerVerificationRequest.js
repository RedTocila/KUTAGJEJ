const mongoose = require('mongoose');

const applicantSnapshotSchema = new mongoose.Schema(
  {
    displayName: { type: String, trim: true },
    email: { type: String, trim: true },
    phone: { type: String, trim: true },
    accountKind: { type: String, enum: ['individual', 'business'] },
    firstName: { type: String, trim: true },
    lastName: { type: String, trim: true },
    businessName: { type: String, trim: true },
    businessOwner: { type: String, trim: true },
    nipt: { type: String, trim: true },
    businessCategory: { type: String, trim: true },
    memberSince: { type: Date },
  },
  { _id: false },
);

const jobEmployerVerificationRequestSchema = new mongoose.Schema(
  {
    applicantId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
    applicantModel: { type: String, enum: ['IndividualUser', 'BusinessUser'], required: true },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
      index: true,
    },
    /** Optional note from the applicant when submitting. */
    message: { type: String, trim: true, maxlength: 2000, default: '' },
    /** Internal note visible to admin only. */
    adminNote: { type: String, trim: true, maxlength: 2000, default: '' },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', default: null },
    reviewedAt: { type: Date, default: null },
    applicantSnapshot: { type: applicantSnapshotSchema, required: true },
  },
  { timestamps: true },
);

jobEmployerVerificationRequestSchema.index(
  { applicantModel: 1, applicantId: 1, createdAt: -1 },
);

module.exports = mongoose.model('JobEmployerVerificationRequest', jobEmployerVerificationRequestSchema);
