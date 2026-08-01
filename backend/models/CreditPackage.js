const mongoose = require('mongoose');

/**
 * A boost-credit package sold for real money via POK. Managed by platform admins
 * (Dashboard → Kredite). `active: false` hides it from the store without deleting
 * historical payments that reference it.
 */
const creditPackageSchema = new mongoose.Schema(
  {
    /** Base boost credits (BC) included in the package. */
    credits: { type: Number, required: true, min: 1 },
    /** Bonus BC granted on top of `credits`. */
    bonusCredits: { type: Number, default: 0, min: 0 },
    /** Price in EUR (major unit). */
    priceEur: { type: Number, required: true, min: 0 },
    /** Short label shown to buyers, e.g. "Starter". */
    labelSq: { type: String, required: true, trim: true },
    /** Optional highlight badge, e.g. "+40 BC". */
    badgeSq: { type: String, trim: true, default: '' },
    active: { type: Boolean, default: true },
    sortOrder: { type: Number, default: 0 },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', default: null },
  },
  { timestamps: true },
);

creditPackageSchema.index({ active: 1, sortOrder: 1 });

module.exports = mongoose.model('CreditPackage', creditPackageSchema);
