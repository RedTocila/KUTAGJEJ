const mongoose = require('mongoose');

const badgeSchema = new mongoose.Schema(
  {
    label: { type: String, required: true, trim: true },
    lifetimePercent: { type: Number, required: true, min: 0 },
    description: { type: String, default: '', trim: true },
  },
  { _id: false },
);

const trustedBadgeSchema = new mongoose.Schema(
  {
    label: { type: String, required: true, trim: true },
    lifetimePercent: { type: Number, required: true, min: 0 },
    reviewsRequired: { type: Number, required: true, min: 0 },
    description: { type: String, default: '', trim: true },
  },
  { _id: false },
);

const freeTierSchema = new mongoose.Schema(
  {
    level: { type: Number, required: true, min: 1 },
    title: { type: String, required: true, trim: true },
    referralsRequired: { type: Number, required: true, min: 0 },
    boostCredits: { type: Number, required: true, min: 0 },
  },
  { _id: false },
);

const paidTierSchema = new mongoose.Schema(
  {
    tier: { type: Number, required: true, min: 1 },
    title: { type: String, required: true, trim: true },
    paidReferralsRequired: { type: Number, required: true, min: 0 },
    boostCredits: { type: Number, required: true, min: 0 },
    premiumMonths: { type: Number, default: 0, min: 0 },
    extraNote: { type: String, default: '', trim: true },
  },
  { _id: false },
);

const reviewMilestoneSchema = new mongoose.Schema(
  {
    reviewsRequired: { type: Number, required: true, min: 0 },
    boostCredits: { type: Number, required: true, min: 0 },
  },
  { _id: false },
);

const referralProgramSchema = new mongoose.Schema({
  _id: { type: String, default: 'default' },
  pageTitle: { type: String, required: true, trim: true },
  pageSubtitle: { type: String, default: '', trim: true },
  freeSignUpTitle: { type: String, required: true, trim: true },
  freeSignUpSubtitle: { type: String, default: '', trim: true },
  freeTiers: { type: [freeTierSchema], default: [] },
  networkBuilderBadge: { type: badgeSchema, required: true },
  paidTitle: { type: String, required: true, trim: true },
  paidSubtitle: { type: String, default: '', trim: true },
  paidTiers: { type: [paidTierSchema], default: [] },
  revenueDriverBadge: { type: badgeSchema, required: true },
  reviewsTitle: { type: String, required: true, trim: true },
  reviewsSubtitle: { type: String, default: '', trim: true },
  reviewMilestones: { type: [reviewMilestoneSchema], default: [] },
  trustedReviewerBadge: { type: trustedBadgeSchema, required: true },
  completionTitle: { type: String, required: true, trim: true },
  completionSubtitle: { type: String, default: '', trim: true },
  platformDominatorBadge: { type: badgeSchema, required: true },
  loginStreakTitle: { type: String, required: true, trim: true },
  loginStreakSubtitle: { type: String, default: '', trim: true },
  loginStreak: {
    daysRequired: { type: Number, required: true, min: 1 },
    boostCredits: { type: Number, required: true, min: 0 },
  },
  updatedAt: { type: Date, default: Date.now },
});

referralProgramSchema.pre('save', function (next) {
  this.updatedAt = new Date();
  next();
});

module.exports = mongoose.model('ReferralProgram', referralProgramSchema);
