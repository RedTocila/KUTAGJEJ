const mongoose = require('mongoose');

/**
 * An active (or past) paid subscription a portal user bought from a Contract plan.
 * Perks are snapshotted at purchase time so later edits to the Contract don't
 * retroactively change what the user paid for.
 */
const userSubscriptionSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
    userModel: { type: String, enum: ['IndividualUser', 'BusinessUser'], required: true },

    contractId: { type: mongoose.Schema.Types.ObjectId, ref: 'Contract', required: true },
    contractTitle: { type: String, trim: true, default: '' },
    listingCategoryKey: { type: String, default: null },
    subscriberKind: { type: String, enum: ['agent', 'company', null], default: null },

    months: { type: Number, required: true, min: 1 },
    priceEur: { type: Number, required: true, min: 0 },

    /** Snapshot of the plan perks. */
    refreshEveryHours: { type: Number, default: null },
    glowBadgeEnabled: { type: Boolean, default: false },
    boostCreditsGranted: { type: Number, default: 0 },
    dailyBoostAccess: { type: Boolean, default: false },
    planCode: { type: String, default: null },
    maxListAllCategories: { type: Number, default: 0 },
    maxJobListings: { type: Number, default: 0 },
    maxCarListings: { type: Number, default: 0 },
    maxApartmentListings: { type: Number, default: 0 },
    maxProductListings: { type: Number, default: 0 },
    maxPremiumListings: { type: Number, default: 0 },

    startsAt: { type: Date, default: Date.now },
    expiresAt: { type: Date, required: true, index: true },
    status: { type: String, enum: ['active', 'expired', 'canceled'], default: 'active', index: true },

    paymentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Payment', default: null },
  },
  { timestamps: true },
);

module.exports = mongoose.model('UserSubscription', userSubscriptionSchema);
