const mongoose = require('mongoose');

/**
 * A single payment attempt through POK Payments.
 * One document is created when the checkout starts (status `pending`) and is
 * flipped to `paid` after we confirm capture with POK (`GET /sdk-orders/{id}`).
 * Admins can see every payment regardless of who paid.
 */
const paymentSchema = new mongoose.Schema(
  {
    payerId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
    payerModel: { type: String, enum: ['IndividualUser', 'BusinessUser'], required: true },
    /** Snapshot so admins can read who paid without extra joins. */
    payerEmail: { type: String, trim: true, default: '' },
    payerName: { type: String, trim: true, default: '' },

    /** What is being bought. */
    type: { type: String, enum: ['subscription', 'credits'], required: true, index: true },
    description: { type: String, trim: true, default: '' },

    /** Amount in MINOR units (cents) actually sent to POK, plus the human major value. */
    amountMinor: { type: Number, required: true, min: 0 },
    amount: { type: Number, required: true, min: 0 },
    currency: { type: String, default: 'EUR' },

    /** POK linkage. */
    pokEnv: { type: String, enum: ['production', 'staging'], default: 'production' },
    pokOrderId: { type: String, trim: true, index: true },
    pokStatus: { type: String, trim: true, default: '' },

    status: {
      type: String,
      enum: ['pending', 'paid', 'failed', 'canceled'],
      default: 'pending',
      index: true,
    },
    /** True once the perks/credits/subscription were granted (guards against double-granting). */
    granted: { type: Boolean, default: false },

    /** Free-form details for the specific purchase type. */
    metadata: {
      contractId: { type: mongoose.Schema.Types.ObjectId, ref: 'Contract', default: null },
      contractTitle: { type: String, trim: true, default: '' },
      months: { type: Number, default: null },
      creditPackageId: { type: String, trim: true, default: '' },
      credits: { type: Number, default: null },
      subscriptionId: { type: mongoose.Schema.Types.ObjectId, ref: 'UserSubscription', default: null },
    },

    paidAt: { type: Date, default: null },
  },
  { timestamps: true },
);

paymentSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Payment', paymentSchema);
