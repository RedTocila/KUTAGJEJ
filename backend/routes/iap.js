'use strict';

const express = require('express');
const auth = require('../middleware/auth');
const requirePortalUser = require('../middleware/require-portal-user');
const { getSupabaseAdmin } = require('../lib/supabase');
const {
  OFFERING_PACKAGE_TO_PRODUCT,
  CREDIT_PACKAGE_TO_PRODUCT,
  PRODUCT_CATALOG,
} = require('../lib/revenuecat-products');

const router = express.Router();

/** Public map the native client uses to pick Store product IDs. */
router.get('/catalog', (_req, res) => {
  res.json({
    offeringId: 'default',
    plans: OFFERING_PACKAGE_TO_PRODUCT,
    credits: CREDIT_PACKAGE_TO_PRODUCT,
    premium: {
      'premium-15': 'al.kutagjej.premium.15',
      'premium-30': 'al.kutagjej.premium.30',
    },
    okazion: {
      'okazion-5': 'al.kutagjej.okazion.5',
    },
    products: Object.keys(PRODUCT_CATALOG),
  });
});

/**
 * After a StoreKit purchase, the client polls until the RevenueCat webhook has granted.
 * Query: ?productId=al.kutagjej...&sinceMs=...
 */
router.get('/recent-grant', auth, requirePortalUser, async (req, res) => {
  try {
    const productId = String(req.query.productId || '').trim();
    const sinceMs = Number(req.query.sinceMs) || Date.now() - 120_000;
    const sinceIso = new Date(sinceMs).toISOString();
    const userId = req.user.id;

    const sb = getSupabaseAdmin();
    let query = sb
      .from('payments')
      .select('id, type, granted, metadata, created_at, amount')
      .eq('payer_id', userId)
      .eq('pok_env', 'apple_iap')
      .eq('granted', true)
      .gte('created_at', sinceIso)
      .order('created_at', { ascending: false })
      .limit(5);

    const { data, error } = await query;
    if (error) throw error;

    const rows = (data || []).filter((row) => {
      if (!productId) return true;
      const meta = row.metadata && typeof row.metadata === 'object' ? row.metadata : {};
      return String(meta.productId || '') === productId;
    });

    res.json({
      found: rows.length > 0,
      payment: rows[0]
        ? {
            id: rows[0].id,
            type: rows[0].type,
            amount: rows[0].amount,
            productId: rows[0].metadata?.productId || null,
            createdAt: rows[0].created_at,
          }
        : null,
    });
  } catch (error) {
    console.error('GET /iap/recent-grant:', error?.message || error);
    res.status(500).json({ message: 'Nuk u kontrollua pagesa.' });
  }
});

module.exports = router;
