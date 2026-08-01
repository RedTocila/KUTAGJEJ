const express = require('express');
const mongoose = require('mongoose');
const Contract = require('../models/Contract');
const Payment = require('../models/Payment');
const UserSubscription = require('../models/UserSubscription');
const authMiddleware = require('../middleware/auth');
const requirePortalUser = require('../middleware/require-portal-user');
const pokClient = require('../lib/pok-client');
const { confirmAndApplyPayment } = require('../lib/apply-payment');
const {
  listActiveCreditPackages,
  getActiveCreditPackage,
  totalCredits,
} = require('../lib/credit-packages');

const router = express.Router();

const MONTH_TO_PRICE_FIELD = {
  1: 'price1Month',
  3: 'price3Months',
  6: 'price6Months',
  12: 'price12Months',
};

function payerLabel(user) {
  const name = [user.firstName, user.lastName].filter(Boolean).join(' ').trim();
  if (name) return name;
  if (user.businessName) return String(user.businessName);
  return user.email || '';
}

function formatPayment(doc) {
  return {
    id: String(doc._id),
    type: doc.type,
    description: doc.description || '',
    amount: doc.amount,
    amountMinor: doc.amountMinor,
    currency: doc.currency,
    status: doc.status,
    pokEnv: doc.pokEnv,
    pokOrderId: doc.pokOrderId || null,
    pokStatus: doc.pokStatus || null,
    metadata: {
      contractId: doc.metadata?.contractId ? String(doc.metadata.contractId) : null,
      contractTitle: doc.metadata?.contractTitle || null,
      months: doc.metadata?.months ?? null,
      creditPackageId: doc.metadata?.creditPackageId || null,
      credits: doc.metadata?.credits ?? null,
      subscriptionId: doc.metadata?.subscriptionId ? String(doc.metadata.subscriptionId) : null,
    },
    paidAt: doc.paidAt,
    createdAt: doc.createdAt,
  };
}

function backendOrigin(req) {
  const configured = String(process.env.API_PUBLIC_URL || '').trim();
  if (configured) return configured.replace(/\/$/, '');
  return `${req.protocol}://${req.get('host')}`;
}

function frontendOrigin() {
  return String(process.env.FRONTEND_URL || 'http://localhost:3000').replace(/\/$/, '');
}

/** Public: credit package catalog (no auth needed to show prices). */
router.get('/credit-packages', async (_req, res) => {
  try {
    const packages = await listActiveCreditPackages();
    res.json({ packages, pokEnv: pokClient.getConfig().env });
  } catch (error) {
    console.error('GET /payments/credit-packages:', error?.message || error);
    res.status(500).json({ message: 'Gabim serveri.' });
  }
});

/**
 * POK server-to-server webhook. Public by design (no user token), but we NEVER
 * trust the payload for state: we re-fetch the order from POK inside
 * confirmAndApplyPayment before granting anything. The `paymentId` query param
 * only tells us which record to reconcile. Always answer 200 so POK stops retrying.
 */
router.post('/webhook/pok', async (req, res) => {
  try {
    const paymentId =
      req.query.paymentId ||
      req.body?.reference ||
      req.body?.data?.reference ||
      req.body?.metadata?.reference;
    if (paymentId && mongoose.Types.ObjectId.isValid(String(paymentId))) {
      await confirmAndApplyPayment(String(paymentId), pokClient).catch((e) =>
        console.error('POK webhook apply error:', e?.message || e),
      );
    }
  } catch (error) {
    console.error('POST /payments/webhook/pok:', error?.message || error);
  }
  res.json({ received: true });
});

// Everything below requires an authenticated portal user (individual / business).
router.use(authMiddleware, requirePortalUser);

/** List the current user's own payments. */
router.get('/mine', async (req, res) => {
  try {
    const docs = await Payment.find({ payerId: req.user._id, payerModel: req.user.constructor.modelName })
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();
    res.json({ payments: docs.map(formatPayment) });
  } catch (error) {
    console.error('GET /payments/mine:', error?.message || error);
    res.status(500).json({ message: 'Gabim serveri.' });
  }
});

/** The current user's active subscriptions. */
router.get('/subscriptions/mine', async (req, res) => {
  try {
    const now = new Date();
    const docs = await UserSubscription.find({
      userId: req.user._id,
      userModel: req.user.constructor.modelName,
    })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();
    const subs = docs.map((d) => ({
      id: String(d._id),
      contractId: d.contractId ? String(d.contractId) : null,
      contractTitle: d.contractTitle || '',
      planCode: d.planCode || null,
      months: d.months,
      priceEur: d.priceEur,
      startsAt: d.startsAt,
      expiresAt: d.expiresAt,
      status: d.status === 'active' && d.expiresAt && new Date(d.expiresAt) < now ? 'expired' : d.status,
      glowBadgeEnabled: d.glowBadgeEnabled,
      dailyBoostAccess: d.dailyBoostAccess,
      boostCreditsGranted: d.boostCreditsGranted,
      refreshEveryHours: d.refreshEveryHours ?? null,
      maxListAllCategories: Number(d.maxListAllCategories) || 0,
      maxJobListings: Number(d.maxJobListings) || 0,
      maxCarListings: Number(d.maxCarListings) || 0,
      maxApartmentListings: Number(d.maxApartmentListings) || 0,
      maxProductListings: Number(d.maxProductListings) || 0,
      maxPremiumListings: Number(d.maxPremiumListings) || 0,
    }));
    res.json({ subscriptions: subs });
  } catch (error) {
    console.error('GET /payments/subscriptions/mine:', error?.message || error);
    res.status(500).json({ message: 'Gabim serveri.' });
  }
});

/** Create a POK order for a subscription plan (Contract) purchase. */
router.post('/subscription/order', async (req, res) => {
  try {
    if (!pokClient.isConfigured()) {
      return res.status(503).json({ message: 'Pagesat nuk janë konfiguruar. Provoni më vonë.' });
    }
    const { contractId, months } = req.body || {};
    if (!mongoose.Types.ObjectId.isValid(String(contractId || ''))) {
      return res.status(400).json({ message: 'Plani i zgjedhur është i pavlefshëm.' });
    }
    const m = Number(months);
    if (![1, 3, 6, 12].includes(m)) {
      return res.status(400).json({ message: 'Zgjidhni një kohëzgjatje të vlefshme (1, 3, 6 ose 12 muaj).' });
    }
    const contract = await Contract.findById(contractId).lean();
    if (!contract) return res.status(404).json({ message: 'Plani nuk u gjet.' });

    const priceEur = contract[MONTH_TO_PRICE_FIELD[m]];
    if (priceEur == null || !Number.isFinite(Number(priceEur)) || Number(priceEur) <= 0) {
      return res.status(400).json({ message: 'Kjo kohëzgjatje nuk ka çmim për këtë plan.' });
    }

    const amount = Number(priceEur);
    const amountMinor = Math.round(amount * 100);
    const description = `Abonim: ${contract.title} · ${m} muaj`;

    const payment = new Payment({
      payerId: req.user._id,
      payerModel: req.user.constructor.modelName,
      payerEmail: req.user.email || '',
      payerName: payerLabel(req.user),
      type: 'subscription',
      description,
      amountMinor,
      amount,
      currency: 'EUR',
      pokEnv: pokClient.getConfig().env,
      status: 'pending',
      metadata: {
        contractId: contract._id,
        contractTitle: contract.title,
        months: m,
      },
    });
    await payment.save();

    const order = await pokClient.createSdkOrder({
      amount,
      currencyCode: 'EUR',
      webhookUrl: `${backendOrigin(req)}/api/payments/webhook/pok?paymentId=${payment._id}`,
      redirectUrl: `${frontendOrigin()}/user/dashboard/pagesat`,
    });

    payment.pokOrderId = order.id;
    await payment.save();

    res.status(201).json({
      paymentId: String(payment._id),
      orderId: order.id,
      amount,
      currency: 'EUR',
      pokEnv: payment.pokEnv,
    });
  } catch (error) {
    console.error('POST /payments/subscription/order:', error?.message || error);
    res.status(502).json({ message: 'Nuk u krijua dot pagesa. Provoni përsëri.' });
  }
});

/** Create a POK order for a boost-credit package purchase. */
router.post('/credits/order', async (req, res) => {
  try {
    if (!pokClient.isConfigured()) {
      return res.status(503).json({ message: 'Pagesat nuk janë konfiguruar. Provoni më vonë.' });
    }
    const { packageId } = req.body || {};
    const pkg = await getActiveCreditPackage(packageId);
    if (!pkg) return res.status(400).json({ message: 'Paketa e krediteve është e pavlefshme.' });

    const amount = Number(pkg.priceEur);
    const amountMinor = Math.round(amount * 100);
    const grantedCredits = totalCredits(pkg);
    const description = `Blerje kreditesh: ${pkg.labelSq} (${grantedCredits} BC)`;

    const payment = new Payment({
      payerId: req.user._id,
      payerModel: req.user.constructor.modelName,
      payerEmail: req.user.email || '',
      payerName: payerLabel(req.user),
      type: 'credits',
      description,
      amountMinor,
      amount,
      currency: 'EUR',
      pokEnv: pokClient.getConfig().env,
      status: 'pending',
      metadata: {
        creditPackageId: String(pkg._id),
        credits: grantedCredits,
      },
    });
    await payment.save();

    const order = await pokClient.createSdkOrder({
      amount,
      currencyCode: 'EUR',
      webhookUrl: `${backendOrigin(req)}/api/payments/webhook/pok?paymentId=${payment._id}`,
      redirectUrl: `${frontendOrigin()}/user/dashboard/pagesat`,
    });

    payment.pokOrderId = order.id;
    await payment.save();

    res.status(201).json({
      paymentId: String(payment._id),
      orderId: order.id,
      amount,
      currency: 'EUR',
      credits: grantedCredits,
      pokEnv: payment.pokEnv,
    });
  } catch (error) {
    console.error('POST /payments/credits/order:', error?.message || error);
    res.status(502).json({ message: 'Nuk u krijua dot pagesa. Provoni përsëri.' });
  }
});

/**
 * Called by the frontend after the POK form reports success. Confirms with POK
 * that the order was captured and grants the purchase. Idempotent.
 */
router.post('/:paymentId/verify', async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.paymentId)) {
      return res.status(400).json({ message: 'ID e pavlefshme.' });
    }
    const existing = await Payment.findById(req.params.paymentId);
    if (!existing) return res.status(404).json({ message: 'Pagesa nuk u gjet.' });
    // Users may only verify their own payments.
    if (
      String(existing.payerId) !== String(req.user._id) ||
      existing.payerModel !== req.user.constructor.modelName
    ) {
      return res.status(403).json({ message: 'Nuk keni akses te kjo pagesë.' });
    }

    const payment = await confirmAndApplyPayment(existing._id, pokClient);
    res.json({ payment: formatPayment(payment), paid: payment.status === 'paid' });
  } catch (error) {
    console.error('POST /payments/:id/verify:', error?.message || error);
    const status = error?.statusCode && Number.isInteger(error.statusCode) ? error.statusCode : 502;
    res.status(status).json({ message: 'Nuk u verifikua dot pagesa. Provoni përsëri.' });
  }
});

module.exports = router;
