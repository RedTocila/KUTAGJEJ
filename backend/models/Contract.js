const mongoose = require('mongoose');
const { CATEGORY_KEYS } = require('./ListingCategory');

const PLAN_CODES = ['free', 'starter', 'grow', 'elite'];

/** Legal / business contract template linked to catalog roles + plan quotas. */
const contractSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  content: { type: String, trim: true, default: '' },
  /** Stable tier id for seeding / upserts (optional for custom admin plans). */
  planCode: { type: String, enum: PLAN_CODES, default: null, index: true },
  sortOrder: { type: Number, default: 0 },
  /**
   * Vertical this contract applies to (e.g. real-estate).
   * Null = platform-wide package spanning all listing categories.
   */
  listingCategoryKey: { type: String, enum: CATEGORY_KEYS, default: null },
  /** Who the tier targets (individual agent vs company). */
  subscriberKind: { type: String, enum: ['agent', 'company'], default: null },
  /** Listing refresh cadence: one refresh every this many hours. */
  refreshEveryHours: { type: Number, default: null, min: 1 },
  /** Trust badge on the member profile. */
  glowBadgeEnabled: { type: Boolean, default: false },
  boostCredits: { type: Number, default: null, min: 0 },
  dailyBoostAccess: { type: Boolean, default: false },
  /** Posting quotas (0 = not included). */
  maxListAllCategories: { type: Number, default: 0, min: 0 },
  maxJobListings: { type: Number, default: 0, min: 0 },
  maxCarListings: { type: Number, default: 0, min: 0 },
  maxApartmentListings: { type: Number, default: 0, min: 0 },
  maxProductListings: { type: Number, default: 0, min: 0 },
  maxPremiumListings: { type: Number, default: 0, min: 0 },
  /** Subscription prices in EUR (main unit) per commitment length. */
  price1Month: { type: Number, default: null, min: 0 },
  price3Months: { type: Number, default: null, min: 0 },
  price6Months: { type: Number, default: null, min: 0 },
  price12Months: { type: Number, default: null, min: 0 },
  roleIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Role' }],
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', default: null },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

contractSchema.index({ planCode: 1, subscriberKind: 1 }, { unique: true, partialFilterExpression: { planCode: { $type: 'string' } } });

contractSchema.pre('save', function () {
  this.updatedAt = Date.now();
});

module.exports = mongoose.model('Contract', contractSchema);
module.exports.PLAN_CODES = PLAN_CODES;
