const mongoose = require('mongoose');

const applicantSnapshotSchema = new mongoose.Schema(
  {
    displayName: { type: String, trim: true },
    email: { type: String, trim: true },
    phone: { type: String, trim: true },
    accountKind: { type: String, enum: ['individual', 'business'] },
    firstName: { type: String },
    lastName: { type: String },
    businessName: { type: String },
    businessOwner: { type: String },
    nipt: { type: String },
    businessCategory: { type: String },
    memberSince: { type: Date },
  },
  { _id: false },
);

const professionalVerificationRequestSchema = new mongoose.Schema(
  {
    applicantId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
    applicantModel: { type: String, enum: ['IndividualUser', 'BusinessUser'], required: true },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
      index: true,
    },
    message: { type: String, trim: true, default: '' },
    adminNote: { type: String, trim: true, default: '' },
    applicantSnapshot: { type: applicantSnapshotSchema, required: true },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', default: null },
    reviewedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

module.exports = mongoose.model('ProfessionalVerificationRequest', professionalVerificationRequestSchema);
