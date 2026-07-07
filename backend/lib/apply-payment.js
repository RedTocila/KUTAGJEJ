const mongoose = require('mongoose');
const Payment = require('../models/Payment');
const UserSubscription = require('../models/UserSubscription');
const IndividualUser = require('../models/IndividualUser');
const BusinessUser = require('../models/BusinessUser');

function userModelFor(name) {
  return name === 'BusinessUser' ? BusinessUser : IndividualUser;
}

/**
 * Confirm a payment against POK and, if it was captured, grant what was bought.
 * Idempotent: safe to call from the verify endpoint AND the webhook — perks are
 * only ever granted once (guarded by `payment.granted`).
 *
 * `pokClient` is injected to avoid a hard dependency cycle and ease testing.
 * Returns the up-to-date Payment document.
 */
async function confirmAndApplyPayment(paymentId, pokClient) {
  const payment = await Payment.findById(paymentId);
  if (!payment) {
    const err = new Error('Pagesa nuk u gjet.');
    err.statusCode = 404;
    throw err;
  }

  // Already finalized — return as-is (idempotent).
  if (payment.status === 'paid' && payment.granted) {
    return payment;
  }
  if (!payment.pokOrderId) {
    const err = new Error('Kjo pagesë nuk ka porosi POK.');
    err.statusCode = 400;
    throw err;
  }

  const order = await pokClient.getSdkOrder(payment.pokOrderId);
  payment.pokStatus = order.status || payment.pokStatus;

  if (!order.paid) {
    // Not captured (yet). Leave as pending so it can be retried / webhook can finalize.
    await payment.save();
    return payment;
  }

  // Defensive: make sure the captured amount matches what we asked for.
  // POK reports `amount` in major currency units (EUR), same as payment.amount.
  if (order.amount != null && Number(order.amount) !== Number(payment.amount)) {
    console.warn(
      `Payment ${payment._id}: POK amount ${order.amount} != expected ${payment.amount}`,
    );
  }

  payment.status = 'paid';
  if (!payment.paidAt) payment.paidAt = new Date();

  if (!payment.granted) {
    if (payment.type === 'subscription') {
      await grantSubscription(payment);
    } else if (payment.type === 'credits') {
      await grantCredits(payment);
    }
    payment.granted = true;
  }

  await payment.save();
  return payment;
}

async function grantSubscription(payment) {
  const Contract = mongoose.model('Contract');
  const contract = payment.metadata?.contractId
    ? await Contract.findById(payment.metadata.contractId).lean()
    : null;

  const months = Number(payment.metadata?.months) || 1;
  const now = new Date();
  const expiresAt = new Date(now);
  expiresAt.setMonth(expiresAt.getMonth() + months);

  const boost = contract && Number.isFinite(Number(contract.boostCredits))
    ? Number(contract.boostCredits)
    : 0;

  const sub = await UserSubscription.create({
    userId: payment.payerId,
    userModel: payment.payerModel,
    contractId: payment.metadata?.contractId || (contract ? contract._id : undefined),
    contractTitle: contract?.title || payment.metadata?.contractTitle || '',
    listingCategoryKey: contract?.listingCategoryKey ?? null,
    subscriberKind: contract?.subscriberKind ?? null,
    months,
    priceEur: payment.amount,
    refreshEveryHours: contract?.refreshEveryHours ?? null,
    glowBadgeEnabled: Boolean(contract?.glowBadgeEnabled),
    boostCreditsGranted: boost,
    dailyBoostAccess: Boolean(contract?.dailyBoostAccess),
    startsAt: now,
    expiresAt,
    status: 'active',
    paymentId: payment._id,
  });

  payment.metadata.subscriptionId = sub._id;

  if (boost > 0) {
    await addBoostCredits(payment.payerModel, payment.payerId, boost);
  }
}

async function grantCredits(payment) {
  const credits = Number(payment.metadata?.credits) || 0;
  if (credits > 0) {
    await addBoostCredits(payment.payerModel, payment.payerId, credits);
  }
}

async function addBoostCredits(modelName, userId, amount) {
  const Model = userModelFor(modelName);
  await Model.updateOne({ _id: userId }, { $inc: { boostCredits: amount } });
}

module.exports = { confirmAndApplyPayment };
