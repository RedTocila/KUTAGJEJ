'use strict';

const express = require('express');
const { getSupabaseAdmin } = require('../lib/supabase');
const { mapPayment, confirmAndApplyPayment } = require('../lib/apply-payment');
const authMiddleware = require('../middleware/auth');
const requirePortalUser = require('../middleware/require-portal-user');
const pokClient = require('../lib/pok-client');
const {
  listActiveCreditPackages,
  getActiveCreditPackage,
  totalCredits,
} = require('../lib/credit-packages');
const { isUuid } = require('../lib/public-listings/query-helpers');

const router = express.Router();

const MONTH_TO_PRICE_FIELD = {
  1: 'price_1_month',
  3: 'price_3_months',
  6: 'price_6_months',
  12: 'price_12_months',
};

function payerLabel(user) {
  const name = [user.firstName, user.lastName].filter(Boolean).join(' ').trim();
  if (name) return name;
  if (user.businessName) return String(user.businessName);
  return user.email || '';
}

function formatPayment(doc) {
  return {
    id: String(doc.id || doc._id),
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
    if (paymentId && isUuid(String(paymentId))) {
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
    const { data, error } = await getSupabaseAdmin()
      .from('payments')
      .select('*')
      .eq('payer_id', req.user.id)
      .order('created_at', { ascending: false })
      .limit(100);
    if (error) throw error;
    res.json({ payments: (data || []).map(mapPayment).map(formatPayment) });
  } catch (error) {
    console.error('GET /payments/mine:', error?.message || error);
    res.status(500).json({ message: 'Gabim serveri.' });
  }
});

/** The current user's active subscriptions. */
router.get('/subscriptions/mine', async (req, res) => {
  try {
    const now = new Date();
    const { data, error } = await getSupabaseAdmin()
      .from('user_subscriptions')
      .select('*')
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false })
      .limit(50);
    if (error) throw error;
    const subs = (data || []).map((d) => ({
      id: String(d.id),
      contractId: d.contract_id ? String(d.contract_id) : null,
      contractTitle: d.contract_title || '',
      planCode: d.plan_code || null,
      months: d.months,
      priceEur: d.price_eur != null ? Number(d.price_eur) : null,
      startsAt: d.starts_at,
      expiresAt: d.expires_at,
      status: d.status === 'active' && d.expires_at && new Date(d.expires_at) < now ? 'expired' : d.status,
      glowBadgeEnabled: Boolean(d.glow_badge_enabled),
      dailyBoostAccess: Boolean(d.daily_boost_access),
      boostCreditsGranted: d.boost_credits_granted,
      refreshEveryHours: d.refresh_every_hours ?? null,
      maxListAllCategories: Number(d.max_list_all_categories) || 0,
      maxJobListings: Number(d.max_job_listings) || 0,
      maxCarListings: Number(d.max_car_listings) || 0,
      maxApartmentListings: Number(d.max_apartment_listings) || 0,
      maxProductListings: Number(d.max_product_listings) || 0,
      maxPremiumListings: Number(d.max_premium_listings) || 0,
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
    if (!isUuid(String(contractId || ''))) {
      return res.status(400).json({ message: 'Plani i zgjedhur është i pavlefshëm.' });
    }
    const m = Number(months);
    if (![1, 3, 6, 12].includes(m)) {
      return res.status(400).json({ message: 'Zgjidhni një kohëzgjatje të vlefshme (1, 3, 6 ose 12 muaj).' });
    }

    const sb = getSupabaseAdmin();
    const { data: contract, error: cErr } = await sb
      .from('contracts')
      .select('*')
      .eq('id', contractId)
      .maybeSingle();
    if (cErr) throw cErr;
    if (!contract) return res.status(404).json({ message: 'Plani nuk u gjet.' });

    const priceEur = contract[MONTH_TO_PRICE_FIELD[m]];
    if (priceEur == null || !Number.isFinite(Number(priceEur)) || Number(priceEur) <= 0) {
      return res.status(400).json({ message: 'Kjo kohëzgjatje nuk ka çmim për këtë plan.' });
    }

    const amount = Number(priceEur);
    const amountMinor = Math.round(amount * 100);
    const description = `Abonim: ${contract.title} · ${m} muaj`;

    const { data: paymentRow, error: pErr } = await sb
      .from('payments')
      .insert({
        payer_id: req.user.id,
        payer_email: req.user.email || '',
        payer_name: payerLabel(req.user),
        type: 'subscription',
        description,
        amount_minor: amountMinor,
        amount,
        currency: 'EUR',
        pok_env: pokClient.getConfig().env,
        status: 'pending',
        metadata: {
          contractId: contract.id,
          contractTitle: contract.title,
          months: m,
          payerModel: req.user.constructor.modelName,
        },
      })
      .select('*')
      .single();
    if (pErr) throw pErr;

    const payment = mapPayment(paymentRow);

    const order = await pokClient.createSdkOrder({
      amount,
      currencyCode: 'EUR',
      webhookUrl: `${backendOrigin(req)}/api/payments/webhook/pok?paymentId=${payment.id}`,
      redirectUrl: `${frontendOrigin()}/user/dashboard/pagesat`,
    });

    const { data: updated, error: uErr } = await sb
      .from('payments')
      .update({ pok_order_id: order.id, updated_at: new Date().toISOString() })
      .eq('id', payment.id)
      .select('*')
      .single();
    if (uErr) throw uErr;
    const saved = mapPayment(updated);

    res.status(201).json({
      paymentId: String(saved.id),
      orderId: order.id,
      amount,
      currency: 'EUR',
      pokEnv: saved.pokEnv,
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

    const sb = getSupabaseAdmin();
    const { data: paymentRow, error: pErr } = await sb
      .from('payments')
      .insert({
        payer_id: req.user.id,
        payer_email: req.user.email || '',
        payer_name: payerLabel(req.user),
        type: 'credits',
        description,
        amount_minor: amountMinor,
        amount,
        currency: 'EUR',
        pok_env: pokClient.getConfig().env,
        status: 'pending',
        metadata: {
          creditPackageId: String(pkg.id),
          credits: grantedCredits,
          payerModel: req.user.constructor.modelName,
        },
      })
      .select('*')
      .single();
    if (pErr) throw pErr;

    const payment = mapPayment(paymentRow);

    const order = await pokClient.createSdkOrder({
      amount,
      currencyCode: 'EUR',
      webhookUrl: `${backendOrigin(req)}/api/payments/webhook/pok?paymentId=${payment.id}`,
      redirectUrl: `${frontendOrigin()}/user/dashboard/pagesat`,
    });

    const { data: updated, error: uErr } = await sb
      .from('payments')
      .update({ pok_order_id: order.id, updated_at: new Date().toISOString() })
      .eq('id', payment.id)
      .select('*')
      .single();
    if (uErr) throw uErr;
    const saved = mapPayment(updated);

    res.status(201).json({
      paymentId: String(saved.id),
      orderId: order.id,
      amount,
      currency: 'EUR',
      credits: grantedCredits,
      pokEnv: saved.pokEnv,
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
    if (!isUuid(req.params.paymentId)) {
      return res.status(400).json({ message: 'ID e pavlefshme.' });
    }
    const { data: existingRow, error } = await getSupabaseAdmin()
      .from('payments')
      .select('*')
      .eq('id', req.params.paymentId)
      .maybeSingle();
    if (error) throw error;
    if (!existingRow) return res.status(404).json({ message: 'Pagesa nuk u gjet.' });
    const existing = mapPayment(existingRow);
    // Users may only verify their own payments.
    if (String(existing.payerId) !== String(req.user.id)) {
      return res.status(403).json({ message: 'Nuk keni akses te kjo pagesë.' });
    }

    const payment = await confirmAndApplyPayment(existing.id, pokClient);
    res.json({ payment: formatPayment(payment), paid: payment.status === 'paid' });
  } catch (error) {
    console.error('POST /payments/:id/verify:', error?.message || error);
    const status = error?.statusCode && Number.isInteger(error.statusCode) ? error.statusCode : 502;
    res.status(status).json({ message: 'Nuk u verifikua dot pagesa. Provoni përsëri.' });
  }
});

module.exports = router;
