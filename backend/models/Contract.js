const mongoose = require('mongoose');
const { CATEGORY_KEYS } = require('./ListingCategory');

/** Legal / business contract template linked to catalog roles + vertical (listing category) plan rules. */
const contractSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  content: { type: String, trim: true, default: '' },
  /** Vertical this contract applies to (e.g. real-estate). */
  listingCategoryKey: { type: String, enum: CATEGORY_KEYS, default: null },
  /** Who the tier targets within the vertical (e.g. individual agent vs company). */
  subscriberKind: { type: String, enum: ['agent', 'company'], default: null },
  /** Listing refresh cadence: one refresh every this many hours. */
  refreshEveryHours: { type: Number, default: null, min: 1 },
  glowBadgeEnabled: { type: Boolean, default: false },
  boostCredits: { type: Number, default: null, min: 0 },
  dailyBoostAccess: { type: Boolean, default: false },
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

contractSchema.pre('save', function () {
  this.updatedAt = Date.now();
});

module.exports = mongoose.model('Contract', contractSchema);
