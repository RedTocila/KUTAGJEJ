'use strict';

const express = require('express');
const { getSupabaseAdmin } = require('../lib/supabase');
const { mapPayment, confirmAndApplyPayment } = require('../lib/apply-payment');
const authMiddleware = require('../middleware/auth');
const requirePortalUser = require('../middleware/require-portal-user');
const pokClient = require('../lib/pok-client');
const { getFrontendBaseUrl } = require('../lib/site-url');
const { listActiveCreditPackages, getActiveCreditPackage, totalCredits } = require('../lib/credit-packages');
const { listAutoRefreshPackages, getAutoRefreshPackage } = require('../lib/auto-refresh-packages');
const { getAutoRefreshSnapshot, purchaseAutoRefreshWithBoostCoins } = require('../lib/listing-auto-refresh');
const { listPremiumPackages, getPremiumPackage } = require('../lib/premium-packages');
const {
  listPremiumVouchers,
  purchasePremiumWithBoostCoins,
  applyPremiumVoucher,
  applyPremiumFromPlan,
  getPremiumQuotaSnapshot,
} = require('../lib/premium-listing');
const { listOkazionPackages, getOkazionPackage } = require('../lib/okazion-packages');
const {
  listOkazionVouchers,
  purchaseOkazionWithBoostCoins,
  applyOkazionVoucher,
  applyOkazionFromPlan,
  getOkazionQuotaSnapshot,
  clampQuantity,
} = require('../lib/okazion-listing');
const { isUuid } = require('../lib/public-listings/query-helpers');
const { priceWithLifetimeDiscount } = require('../lib/lifetime-discount');

const router = express.Router();
const AUTO_REFRESH_ENABLED = process.env.AUTO_REFRESH_ENABLED === 'true';

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

function discountMeta(priced) {
  if (!priced.lifetimePercent) return {};
  return {
    listPriceEur: priced.listPriceEur,
    lifetimePercent: priced.lifetimePercent,
  };
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
      autoRefreshPackageId: doc.metadata?.autoRefreshPackageId || null,
      autoRefreshSlots: doc.metadata?.autoRefreshSlots ?? null,
      premiumPackageId: doc.metadata?.premiumPackageId || null,
      premiumDays: doc.metadata?.premiumDays ?? null,
      premiumVoucherId: doc.metadata?.premiumVoucherId || null,
      okazionPackageId: doc.metadata?.okazionPackageId || null,
      okazionDays: doc.metadata?.okazionDays ?? null,
      okazionQuantity: doc.metadata?.okazionQuantity ?? null,
      okazionVoucherId: doc.metadata?.okazionVoucherId || null,
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
  return getFrontendBaseUrl();
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

/** Public: auto-refresh slot packs. */
router.get('/auto-refresh-packages', async (_req, res) => {
  try {
    res.json({
      enabled: AUTO_REFRESH_ENABLED,
      packages: AUTO_REFRESH_ENABLED ? listAutoRefreshPackages() : [],
      pokEnv: pokClient.getConfig().env,
    });
  } catch (error) {
    console.error('GET /payments/auto-refresh-packages:', error?.message || error);
    res.status(500).json({ message: 'Gabim serveri.' });
  }
});

/** Public: premium listing packs. */
router.get('/premium-packages', async (_req, res) => {
  try {
    res.json({ packages: listPremiumPackages(), pokEnv: pokClient.getConfig().env });
  } catch (error) {
    console.error('GET /payments/premium-packages:', error?.message || error);
    res.status(500).json({ message: 'Gabim serveri.' });
  }
});

/** Public: OKAZION listing packs. */
router.get('/okazion-packages', async (_req, res) => {
  try {
    res.json({ packages: listOkazionPackages(), pokEnv: pokClient.getConfig().env });
  } catch (error) {
    console.error('GET /payments/okazion-packages:', error?.message || error);
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
      req.query.paymentId || req.body?.reference || req.body?.data?.reference || req.body?.metadata?.reference;
    if (paymentId && isUuid(String(paymentId))) {
      await confirmAndApplyPayment(String(paymentId), pokClient).catch((e) =>
        console.error('POK webhook apply error:', e?.message || e)
      );
    }
  } catch (error) {
    console.error('POST /payments/webhook/pok:', error?.message || error);
  }
  res.json({ received: true });
});

// Everything below requires an authenticated portal user (individual / business).
router.use(authMiddleware, requirePortalUser);

/** List the current user's successful (paid) payments. */
router.get('/mine', async (req, res) => {
  try {
    const { data, error } = await getSupabaseAdmin()
      .from('payments')
      .select('*')
      .eq('payer_id', req.user.id)
      .eq('status', 'paid')
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
      maxOkazionListings: Number(d.max_okazion_listings) || 0,
    }));
    res.json({ subscriptions: subs });
  } catch (error) {
    console.error('GET /payments/subscriptions/mine:', error?.message || error);
    res.status(500).json({ message: 'Gabim serveri.' });
  }
});

/** Cancel one of the current user's active subscriptions (ends access immediately). */
router.post('/subscriptions/:id/cancel', async (req, res) => {
  try {
    const id = String(req.params.id || '').trim();
    if (!isUuid(id)) {
      return res.status(400).json({ message: 'Abonim i pavlefshëm.' });
    }

    const { data: existing, error: findErr } = await getSupabaseAdmin()
      .from('user_subscriptions')
      .select('id, status, user_id')
      .eq('id', id)
      .eq('user_id', req.user.id)
      .maybeSingle();
    if (findErr) throw findErr;
    if (!existing) {
      return res.status(404).json({ message: 'Abonimi nuk u gjet.' });
    }
    if (existing.status !== 'active') {
      return res.status(400).json({ message: 'Ky abonim nuk është aktiv.' });
    }

    const nowIso = new Date().toISOString();
    const { data: updated, error: updErr } = await getSupabaseAdmin()
      .from('user_subscriptions')
      .update({
        status: 'canceled',
        // End access immediately. Plans are prepaid one-shots (no POK auto-renew);
        // the next charge only happens if the user starts a new checkout.
        expires_at: nowIso,
        updated_at: nowIso,
      })
      .eq('id', id)
      .eq('user_id', req.user.id)
      .eq('status', 'active')
      .select('*')
      .maybeSingle();
    if (updErr) throw updErr;
    if (!updated) {
      return res.status(409).json({ message: 'Abonimi nuk mund të anulohet.' });
    }

    res.json({
      subscription: {
        id: String(updated.id),
        contractId: updated.contract_id ? String(updated.contract_id) : null,
        contractTitle: updated.contract_title || '',
        planCode: updated.plan_code || null,
        months: updated.months,
        priceEur: updated.price_eur != null ? Number(updated.price_eur) : null,
        startsAt: updated.starts_at,
        expiresAt: updated.expires_at,
        status: 'canceled',
        glowBadgeEnabled: Boolean(updated.glow_badge_enabled),
        dailyBoostAccess: Boolean(updated.daily_boost_access),
        boostCreditsGranted: updated.boost_credits_granted,
        refreshEveryHours: updated.refresh_every_hours ?? null,
        maxListAllCategories: Number(updated.max_list_all_categories) || 0,
        maxJobListings: Number(updated.max_job_listings) || 0,
        maxCarListings: Number(updated.max_car_listings) || 0,
        maxApartmentListings: Number(updated.max_apartment_listings) || 0,
        maxProductListings: Number(updated.max_product_listings) || 0,
        maxPremiumListings: Number(updated.max_premium_listings) || 0,
        maxOkazionListings: Number(updated.max_okazion_listings) || 0,
      },
    });
  } catch (error) {
    console.error('POST /payments/subscriptions/:id/cancel:', error?.message || error);
    res.status(500).json({ message: 'Gabim serveri.' });
  }
});

/** Current auto-refresh capacity, usage, and interval from the active plan. */
router.get('/auto-refresh/status', async (req, res) => {
  try {
    if (!AUTO_REFRESH_ENABLED) {
      return res.json({
        enabled: false,
        slots: 0,
        used: 0,
        planCode: 'disabled',
        refreshEveryHours: 0,
        packages: [],
        enrolled: [],
      });
    }
    const snapshot = await getAutoRefreshSnapshot(req.user.id);
    res.json({
      enabled: AUTO_REFRESH_ENABLED,
      slots: snapshot.slots,
      used: snapshot.used,
      planCode: snapshot.planCode,
      refreshEveryHours: snapshot.refreshEveryHours,
      packages: AUTO_REFRESH_ENABLED ? listAutoRefreshPackages() : [],
      enrolled: snapshot.enrolled,
    });
  } catch (error) {
    console.error('GET /payments/auto-refresh/status:', error?.message || error);
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
    const { data: contract, error: cErr } = await sb.from('contracts').select('*').eq('id', contractId).maybeSingle();
    if (cErr) throw cErr;
    if (!contract) return res.status(404).json({ message: 'Plani nuk u gjet.' });

    const priceEur = contract[MONTH_TO_PRICE_FIELD[m]];
    if (priceEur == null || !Number.isFinite(Number(priceEur)) || Number(priceEur) <= 0) {
      return res.status(400).json({ message: 'Kjo kohëzgjatje nuk ka çmim për këtë plan.' });
    }

    const priced = await priceWithLifetimeDiscount(req.user, priceEur);
    const amount = priced.amount;
    const amountMinor = priced.amountMinor;
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
          ...discountMeta(priced),
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
      lifetimePercent: priced.lifetimePercent,
      listPriceEur: priced.listPriceEur,
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

    const priced = await priceWithLifetimeDiscount(req.user, pkg.priceEur);
    const amount = priced.amount;
    const amountMinor = priced.amountMinor;
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
          ...discountMeta(priced),
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
      lifetimePercent: priced.lifetimePercent,
      listPriceEur: priced.listPriceEur,
    });
  } catch (error) {
    console.error('POST /payments/credits/order:', error?.message || error);
    res.status(502).json({ message: 'Nuk u krijua dot pagesa. Provoni përsëri.' });
  }
});

/** Create a POK order for an auto-refresh slot pack. */
router.post('/auto-refresh/order', async (req, res) => {
  try {
    if (!AUTO_REFRESH_ENABLED) {
      return res.status(410).json({ message: 'Auto-Refresh është përkohësisht i çaktivizuar.' });
    }
    if (!pokClient.isConfigured()) {
      return res.status(503).json({ message: 'Pagesat nuk janë konfiguruar. Provoni më vonë.' });
    }
    const { packageId } = req.body || {};
    const pkg = getAutoRefreshPackage(packageId);
    if (!pkg) return res.status(400).json({ message: 'Paketa Auto-Refresh është e pavlefshme.' });

    const priced = await priceWithLifetimeDiscount(req.user, pkg.priceEur);
    const amount = priced.amount;
    const amountMinor = priced.amountMinor;
    const description = `Auto-Refresh: ${pkg.labelSq}`;

    const sb = getSupabaseAdmin();
    const { data: paymentRow, error: pErr } = await sb
      .from('payments')
      .insert({
        payer_id: req.user.id,
        payer_email: req.user.email || '',
        payer_name: payerLabel(req.user),
        type: 'auto-refresh',
        description,
        amount_minor: amountMinor,
        amount,
        currency: 'EUR',
        pok_env: pokClient.getConfig().env,
        status: 'pending',
        metadata: {
          autoRefreshPackageId: String(pkg.id),
          autoRefreshSlots: pkg.slots,
          payerModel: req.user.constructor.modelName,
          ...discountMeta(priced),
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
      slots: pkg.slots,
      pokEnv: saved.pokEnv,
      lifetimePercent: priced.lifetimePercent,
      listPriceEur: priced.listPriceEur,
    });
  } catch (error) {
    console.error('POST /payments/auto-refresh/order:', error?.message || error);
    res.status(502).json({ message: 'Nuk u krijua dot pagesa. Provoni përsëri.' });
  }
});

/** Buy auto-refresh slot pack with Boost Coins (no card). */
router.post('/auto-refresh/buy-with-credits', async (req, res) => {
  try {
    if (!AUTO_REFRESH_ENABLED) {
      return res.status(410).json({ message: 'Auto-Refresh është përkohësisht i çaktivizuar.' });
    }
    const { packageId } = req.body || {};
    const result = await purchaseAutoRefreshWithBoostCoins({
      userId: req.user.id,
      packageId,
    });
    if (!result.ok) {
      return res.status(result.status || 400).json({ message: result.message });
    }
    const snapshot = await getAutoRefreshSnapshot(req.user.id);
    res.json({
      ok: true,
      slots: result.slots,
      autoRefreshSlots: result.autoRefreshSlots,
      boostCredits: result.boostCredits,
      cost: result.cost,
      used: snapshot.used,
      message: `U shtuan ${result.slots} vende Auto-Refresh me Boost Coins.`,
    });
  } catch (error) {
    console.error('POST /payments/auto-refresh/buy-with-credits:', error?.message || error);
    res.status(500).json({ message: 'Gabim serveri.' });
  }
});

/** Create a POK order for a premium listing pack. */
router.post('/premium/order', async (req, res) => {
  try {
    if (!pokClient.isConfigured()) {
      return res.status(503).json({ message: 'Pagesat nuk janë konfiguruar. Provoni më vonë.' });
    }
    const { packageId } = req.body || {};
    const pkg = getPremiumPackage(packageId);
    if (!pkg) return res.status(400).json({ message: 'Paketa Premium është e pavlefshme.' });

    const priced = await priceWithLifetimeDiscount(req.user, pkg.priceEur);
    const amount = priced.amount;
    const amountMinor = priced.amountMinor;
    const description = `Premium listing: ${pkg.labelSq}`;

    const sb = getSupabaseAdmin();
    const { data: paymentRow, error: pErr } = await sb
      .from('payments')
      .insert({
        payer_id: req.user.id,
        payer_email: req.user.email || '',
        payer_name: payerLabel(req.user),
        type: 'premium',
        description,
        amount_minor: amountMinor,
        amount,
        currency: 'EUR',
        pok_env: pokClient.getConfig().env,
        status: 'pending',
        metadata: {
          premiumPackageId: String(pkg.id),
          premiumDays: pkg.days,
          premiumPriceBc: pkg.priceBc,
          payerModel: req.user.constructor.modelName,
          ...discountMeta(priced),
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
      redirectUrl: `${frontendOrigin()}/user/dashboard/paketat/shtese?assignPremium=1`,
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
      days: pkg.days,
      pokEnv: saved.pokEnv,
      lifetimePercent: priced.lifetimePercent,
      listPriceEur: priced.listPriceEur,
    });
  } catch (error) {
    console.error('POST /payments/premium/order:', error?.message || error);
    res.status(502).json({ message: 'Nuk u krijua dot pagesa. Provoni përsëri.' });
  }
});

/** Buy premium pack with Boost Coins (no card). */
router.post('/premium/buy-with-credits', async (req, res) => {
  try {
    const { packageId } = req.body || {};
    const result = await purchasePremiumWithBoostCoins({
      userId: req.user.id,
      packageId,
    });
    if (!result.ok) {
      return res.status(result.status || 400).json({ message: result.message });
    }
    res.json({
      ok: true,
      voucher: result.voucher,
      boostCredits: result.boostCredits,
      cost: result.cost,
      message: 'Premium u blë me Boost Coins. Zgjidhni njoftimin për ta aktivizuar.',
    });
  } catch (error) {
    console.error('POST /payments/premium/buy-with-credits:', error?.message || error);
    res.status(500).json({ message: 'Gabim serveri.' });
  }
});

/** Unused / recent premium vouchers for the current user. */
router.get('/premium/vouchers', async (req, res) => {
  try {
    const unusedOnly = String(req.query.unusedOnly || '') === '1';
    const vouchers = await listPremiumVouchers(req.user.id, { unusedOnly });
    res.json({ vouchers });
  } catch (error) {
    console.error('GET /payments/premium/vouchers:', error?.message || error);
    res.status(500).json({ message: 'Gabim serveri.' });
  }
});

/** Grow/Elite Premium Listing quota (30-day slots included with the plan). */
router.get('/premium/quota', async (req, res) => {
  try {
    const quota = await getPremiumQuotaSnapshot(req.user.id);
    res.json(quota);
  } catch (error) {
    console.error('GET /payments/premium/quota:', error?.message || error);
    res.status(500).json({ message: 'Gabim serveri.' });
  }
});

/** Apply an unused premium voucher to one of the user's listings. */
router.post('/premium/apply', async (req, res) => {
  try {
    const voucherId = String(req.body?.voucherId || '').trim();
    const kind = String(req.body?.kind || '').trim();
    const listingId = String(req.body?.listingId || '').trim();
    const result = await applyPremiumVoucher({
      userId: req.user.id,
      voucherId,
      kind,
      listingId,
    });
    if (!result.ok) {
      return res.status(result.status || 400).json({ message: result.message });
    }
    res.json({
      ok: true,
      voucher: result.voucher,
      premiumUntil: result.premiumUntil,
      refreshedAt: result.refreshedAt,
      message: 'Njoftimi u bë Premium.',
    });
  } catch (error) {
    console.error('POST /payments/premium/apply:', error?.message || error);
    res.status(500).json({ message: 'Gabim serveri.' });
  }
});

/** Spend one plan Premium slot (30 days) on a listing. */
router.post('/premium/apply-from-plan', async (req, res) => {
  try {
    const kind = String(req.body?.kind || '').trim();
    const listingId = String(req.body?.listingId || '').trim();
    const result = await applyPremiumFromPlan({
      userId: req.user.id,
      kind,
      listingId,
    });
    if (!result.ok) {
      return res.status(result.status || 400).json({ message: result.message });
    }
    res.json({
      ok: true,
      alreadyActive: Boolean(result.alreadyActive),
      voucher: result.voucher,
      premiumUntil: result.premiumUntil,
      refreshedAt: result.refreshedAt,
      quota: result.quota,
      message: result.alreadyActive
        ? 'Ky njoftim është tashmë Premium.'
        : 'Njoftimi u bë Premium për 30 ditë nga paketa.',
    });
  } catch (error) {
    console.error('POST /payments/premium/apply-from-plan:', error?.message || error);
    res.status(500).json({ message: 'Gabim serveri.' });
  }
});

/** Create a POK order for OKAZION packs (supports quantity stacking). */
router.post('/okazion/order', async (req, res) => {
  try {
    if (!pokClient.isConfigured()) {
      return res.status(503).json({ message: 'Pagesat nuk janë konfiguruar. Provoni më vonë.' });
    }
    const { packageId, quantity } = req.body || {};
    const pkg = getOkazionPackage(packageId);
    if (!pkg) return res.status(400).json({ message: 'Paketa OKAZION është e pavlefshme.' });
    const qty = clampQuantity(quantity);

    const priced = await priceWithLifetimeDiscount(req.user, Number(pkg.priceEur) * qty);
    const amount = priced.amount;
    const amountMinor = priced.amountMinor;
    const description = qty > 1 ? `OKAZION ×${qty}: ${pkg.labelSq}` : `OKAZION listing: ${pkg.labelSq}`;

    const sb = getSupabaseAdmin();
    const { data: paymentRow, error: pErr } = await sb
      .from('payments')
      .insert({
        payer_id: req.user.id,
        payer_email: req.user.email || '',
        payer_name: payerLabel(req.user),
        type: 'okazion',
        description,
        amount_minor: amountMinor,
        amount,
        currency: 'EUR',
        pok_env: pokClient.getConfig().env,
        status: 'pending',
        metadata: {
          okazionPackageId: String(pkg.id),
          okazionDays: pkg.days,
          okazionPriceBc: pkg.priceBc,
          okazionUnitPriceEur: pkg.priceEur,
          okazionQuantity: qty,
          payerModel: req.user.constructor.modelName,
          ...discountMeta(priced),
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
      redirectUrl: `${frontendOrigin()}/user/dashboard/paketat/shtese?assignOkazion=1`,
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
      days: pkg.days,
      quantity: qty,
      pokEnv: saved.pokEnv,
      lifetimePercent: priced.lifetimePercent,
      listPriceEur: priced.listPriceEur,
    });
  } catch (error) {
    console.error('POST /payments/okazion/order:', error?.message || error);
    res.status(502).json({ message: 'Nuk u krijua dot pagesa. Provoni përsëri.' });
  }
});

/** Buy OKAZION pack(s) with Boost Coins (no card). */
router.post('/okazion/buy-with-credits', async (req, res) => {
  try {
    const { packageId, quantity } = req.body || {};
    const result = await purchaseOkazionWithBoostCoins({
      userId: req.user.id,
      packageId,
      quantity,
    });
    if (!result.ok) {
      return res.status(result.status || 400).json({ message: result.message });
    }
    const qty = result.quantity || 1;
    res.json({
      ok: true,
      voucher: result.voucher,
      vouchers: result.vouchers,
      quantity: qty,
      boostCredits: result.boostCredits,
      cost: result.cost,
      message:
        qty > 1
          ? `${qty} OKAZION u blenë me Boost Coins. Mund t'i aplikoni më vonë.`
          : 'OKAZION u blë me Boost Coins. Zgjidhni njoftimin për ta aktivizuar.',
    });
  } catch (error) {
    console.error('POST /payments/okazion/buy-with-credits:', error?.message || error);
    res.status(500).json({ message: 'Gabim serveri.' });
  }
});

router.get('/okazion/vouchers', async (req, res) => {
  try {
    const unusedOnly = String(req.query.unusedOnly || '') === '1';
    const vouchers = await listOkazionVouchers(req.user.id, { unusedOnly });
    res.json({ vouchers });
  } catch (error) {
    console.error('GET /payments/okazion/vouchers:', error?.message || error);
    res.status(500).json({ message: 'Gabim serveri.' });
  }
});

router.get('/okazion/quota', async (req, res) => {
  try {
    const quota = await getOkazionQuotaSnapshot(req.user.id);
    res.json(quota);
  } catch (error) {
    console.error('GET /payments/okazion/quota:', error?.message || error);
    res.status(500).json({ message: 'Gabim serveri.' });
  }
});

router.post('/okazion/apply', async (req, res) => {
  try {
    const voucherId = String(req.body?.voucherId || '').trim();
    const kind = String(req.body?.kind || '').trim();
    const listingId = String(req.body?.listingId || '').trim();
    const result = await applyOkazionVoucher({
      userId: req.user.id,
      voucherId,
      kind,
      listingId,
    });
    if (!result.ok) {
      return res.status(result.status || 400).json({ message: result.message });
    }
    res.json({
      ok: true,
      voucher: result.voucher,
      okazionUntil: result.okazionUntil,
      refreshedAt: result.refreshedAt,
      message: 'Njoftimi u bë OKAZION për 7 ditë.',
    });
  } catch (error) {
    console.error('POST /payments/okazion/apply:', error?.message || error);
    res.status(500).json({ message: 'Gabim serveri.' });
  }
});

router.post('/okazion/apply-from-plan', async (req, res) => {
  try {
    const kind = String(req.body?.kind || '').trim();
    const listingId = String(req.body?.listingId || '').trim();
    const result = await applyOkazionFromPlan({
      userId: req.user.id,
      kind,
      listingId,
    });
    if (!result.ok) {
      return res.status(result.status || 400).json({ message: result.message });
    }
    res.json({
      ok: true,
      alreadyActive: Boolean(result.alreadyActive),
      voucher: result.voucher,
      okazionUntil: result.okazionUntil,
      refreshedAt: result.refreshedAt,
      quota: result.quota,
      message: result.alreadyActive
        ? 'Ky njoftim është tashmë OKAZION.'
        : 'Njoftimi u bë OKAZION për 7 ditë nga paketa.',
    });
  } catch (error) {
    console.error('POST /payments/okazion/apply-from-plan:', error?.message || error);
    res.status(500).json({ message: 'Gabim serveri.' });
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
