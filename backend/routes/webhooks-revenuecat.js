'use strict';

const express = require('express');
const { grantRevenueCatPurchase, expireAppleSubscription } = require('../lib/revenuecat-grants');
const { getProductSpec } = require('../lib/revenuecat-products');

const router = express.Router();

/** Events that should grant (or re-grant on renewal). */
const GRANT_TYPES = new Set([
  'INITIAL_PURCHASE',
  'NON_RENEWING_PURCHASE',
  'RENEWAL',
  'PRODUCT_CHANGE',
  'UNCANCELLATION',
]);

/** Subscription ended — revoke active plan row. */
const EXPIRE_TYPES = new Set(['EXPIRATION']);

function verifyAuthorization(req) {
  const expected = String(process.env.REVENUECAT_WEBHOOK_SECRET || '').trim();
  if (!expected) {
    // Misconfigured — refuse rather than accept open webhooks.
    return false;
  }
  const header = String(req.get('authorization') || '');
  if (header === expected) return true;
  if (header === `Bearer ${expected}`) return true;
  return false;
}

/**
 * RevenueCat server notification.
 * Configure in RevenueCat → Integrations → Webhooks:
 *   URL: https://www.kutagjej.al/api/webhooks/revenuecat
 *   Authorization: value of REVENUECAT_WEBHOOK_SECRET
 */
router.post('/', async (req, res) => {
  try {
    if (!verifyAuthorization(req)) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const body = req.body || {};
    const event = body.event || body;
    const eventId = String(event.id || event.event_timestamp_ms || '').trim();
    const eventType = String(event.type || '').trim().toUpperCase();
    const appUserId = String(event.app_user_id || '').trim();
    const productId = String(event.product_id || event.new_product_id || '').trim();

    if (!eventId || !eventType || !appUserId) {
      return res.status(400).json({ message: 'Invalid RevenueCat payload' });
    }

    // Anonymous / RC-generated ids we never mapped to a profile — ignore quietly.
    if (appUserId.startsWith('$RCAnonymousID:')) {
      console.warn('[revenuecat] anonymous app_user_id, skip', eventId);
      return res.status(200).json({ ok: true, skipped: 'anonymous' });
    }

    if (EXPIRE_TYPES.has(eventType)) {
      if (productId && getProductSpec(productId)) {
        await expireAppleSubscription(appUserId, productId);
      }
      return res.status(200).json({ ok: true, expired: true });
    }

    if (!GRANT_TYPES.has(eventType)) {
      return res.status(200).json({ ok: true, ignored: eventType });
    }

    if (!productId || !getProductSpec(productId)) {
      console.warn('[revenuecat] unknown product', productId, eventType);
      return res.status(200).json({ ok: true, skipped: 'unknown_product', productId });
    }

    const price =
      event.price != null
        ? Number(event.price)
        : event.price_in_purchased_currency != null
          ? Number(event.price_in_purchased_currency)
          : null;

    const result = await grantRevenueCatPurchase({
      eventId,
      eventType,
      appUserId,
      productId,
      transactionId: event.transaction_id || event.original_transaction_id || null,
      price,
      currency: event.currency || 'EUR',
      expirationAtMs: event.expiration_at_ms || null,
    });

    if (!result.ok) {
      const status = result.status || 400;
      // 404 profile: acknowledge so RC doesn't retry forever for deleted users.
      if (status === 404) {
        console.warn('[revenuecat]', result.message);
        return res.status(200).json(result);
      }
      return res.status(status).json(result);
    }

    return res.status(200).json(result);
  } catch (error) {
    console.error('POST /webhooks/revenuecat:', error?.message || error);
    return res.status(500).json({ message: 'Webhook processing failed' });
  }
});

module.exports = router;
