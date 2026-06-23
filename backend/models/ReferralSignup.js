const mongoose = require('mongoose');

const referralSignupSchema = new mongoose.Schema(
  {
    referrerId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
    referrerModel: { type: String, enum: ['IndividualUser', 'BusinessUser'], required: true },
    referredUserId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
    referredUserModel: { type: String, enum: ['IndividualUser', 'BusinessUser'], required: true },
    kind: { type: String, enum: ['free-signup', 'paid'], default: 'free-signup', index: true },
    /** Boost credits awarded to referrer for this signup (tier bonuses triggered). */
    creditsAwarded: { type: Number, default: 0, min: 0 },
    referralCodeUsed: { type: String, trim: true, default: '' },
  },
  { timestamps: true },
);

referralSignupSchema.index({ referredUserId: 1, referredUserModel: 1 }, { unique: true });
referralSignupSchema.index({ referrerId: 1, referrerModel: 1, createdAt: -1 });

module.exports = mongoose.model('ReferralSignup', referralSignupSchema);
