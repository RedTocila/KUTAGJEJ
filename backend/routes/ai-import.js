'use strict';

const express = require('express');
const authMiddleware = require('../middleware/auth');
const requirePortalUser = require('../middleware/require-portal-user');
const {
  isOpenAiConfigured,
  importListingsFromLinks,
} = require('../lib/ai-import-listings');
const {
  isOpenAiConfigured: isMenuAiConfigured,
  importMenuFromImages,
} = require('../lib/ai-import-menu');
const {
  resolveAiListingCharge,
  chargeAiUsage,
  refundAiUsage,
  getAiUsageSnapshot,
} = require('../lib/ai-usage');
const { getAiUsagePrices } = require('../lib/ai-usage-prices');
const { roundBc } = require('../lib/boost-credits');
const { createAiImportBatch } = require('../lib/ai-import-batch');

const router = express.Router();

function firstUrlLabel(urls) {
  const list = Array.isArray(urls) ? urls : [];
  const first = list.find((u) => typeof u === 'string' && u.trim());
  return first ? String(first).trim() : null;
}

/** GET /api/ai/usage — Boost Coin rates + personal AI spend history. */
router.get('/usage', authMiddleware, requirePortalUser, async (req, res) => {
  try {
    const snapshot = await getAiUsageSnapshot(req.user.id);
    res.json({ ok: true, ...snapshot });
  } catch (err) {
    console.error('GET /ai/usage:', err?.message || err);
    res.json({
      ok: true,
      balance: 0,
      costs: { aiBuildPerLink: 1, other: 0.5, aiMenuPerImage: 1, aiSearch: 0 },
      events: [],
    });
  }
});

/** GET /api/ai/import-quota — current BC balance (legacy path used by older clients). */
router.get('/import-quota', authMiddleware, requirePortalUser, async (req, res) => {
  try {
    const snapshot = await getAiUsageSnapshot(req.user.id);
    res.json({
      ok: true,
      balance: snapshot.balance,
      costs: snapshot.costs,
    });
  } catch (err) {
    console.error('GET /ai/import-quota:', err?.message || err);
    res.status(500).json({ message: err?.message || 'Failed to load AI balance' });
  }
});

/** POST /api/ai/import-listings — turn website/Instagram links into listing drafts. */
router.post('/import-listings', authMiddleware, requirePortalUser, async (req, res) => {
  try {
    if (!isOpenAiConfigured()) {
      res.status(503).json({ message: 'AI import is not configured' });
      return;
    }

    const urls = Array.isArray(req.body?.urls) ? req.body.urls : [];
    const text = String(req.body?.text ?? req.body?.links ?? req.body?.prompt ?? '').trim();
    const category = String(req.body?.category || '').trim() || null;
    const mode = String(req.body?.mode || '').trim() === 'edit' ? 'edit' : 'create';
    const feature = String(req.body?.feature || '').trim().toLowerCase();
    const images = Array.isArray(req.body?.images) ? req.body.images : [];
    const profile = req.body?.profile && typeof req.body.profile === 'object' ? req.body.profile : null;
    const currentListing =
      req.body?.currentListing && typeof req.body.currentListing === 'object'
        ? req.body.currentListing
        : null;
    const incomingBatchId = String(req.body?.batchId || '').trim();
    const requestedBatchSize = Number.parseInt(String(req.body?.batchSize ?? ''), 10);

    if (!urls.length && !text && !images.length) {
      res.status(400).json({ message: 'Paste a link, describe the listing, or attach images' });
      return;
    }

    const chargePlan = await resolveAiListingCharge({
      mode,
      feature,
      urlCount: urls.length,
    });
    const charged = await chargeAiUsage({
      userId: req.user.id,
      kind: chargePlan.kind,
      units: chargePlan.units,
      cost: chargePlan.cost,
      sourceLabel: firstUrlLabel(urls) || (text ? text.slice(0, 120) : images.length ? 'images' : null),
    });
    if (!charged.ok) {
      res.status(charged.status).json({
        message: charged.message,
        code: charged.code,
        balance: charged.balance,
        cost: charged.cost,
      });
      return;
    }

    const batchId =
      incomingBatchId ||
      createAiImportBatch({
        userId: req.user.id,
        cap: Number.isFinite(requestedBatchSize) ? requestedBatchSize : Math.max(1, urls.length || 1),
      });

    try {
      const result = await importListingsFromLinks({
        urls,
        text,
        category,
        profile,
        images,
        mode,
        currentListing,
      });
      res.json({
        ok: true,
        drafts: result.drafts,
        boostCredits: charged.balance,
        usage: {
          kind: chargePlan.kind,
          cost: charged.cost,
          units: chargePlan.units,
        },
        batchId,
      });
    } catch (err) {
      await refundAiUsage({
        userId: req.user.id,
        eventId: charged.eventId,
        cost: charged.cost,
        fallback: charged.fallback,
      });
      throw err;
    }
  } catch (err) {
    console.error('POST /ai/import-listings:', err?.message || err);
    const status = Number.isFinite(err?.status) ? err.status : 500;
    res.status(status).json({ message: err?.message || 'AI import failed' });
  }
});

/** POST /api/ai/import-menu — extract menu categories/items from photo(s). */
router.post('/import-menu', authMiddleware, requirePortalUser, async (req, res) => {
  try {
    if (!isMenuAiConfigured()) {
      res.status(503).json({ message: 'AI import is not configured' });
      return;
    }

    const images = Array.isArray(req.body?.images) ? req.body.images : [];
    const imageCount = images.filter((img) => typeof img === 'string' && String(img).trim()).length;
    if (!imageCount) {
      res.status(400).json({ message: 'Ngarkoni të paktën një foto të menusë.' });
      return;
    }
    const units = Math.min(20, imageCount);
    const prices = await getAiUsagePrices();
    const charged = await chargeAiUsage({
      userId: req.user.id,
      kind: 'ai_menu',
      units,
      cost: roundBc(prices.aiMenuPerImage * units),
      sourceLabel: 'menu',
    });
    if (!charged.ok) {
      res.status(charged.status).json({
        message: charged.message,
        code: charged.code,
        balance: charged.balance,
        cost: charged.cost,
      });
      return;
    }

    try {
      const result = await importMenuFromImages({ images });
      res.json({
        ok: true,
        categories: result.categories,
        items: result.items,
        boostCredits: charged.balance,
        usage: { kind: 'ai_menu', cost: charged.cost, units },
      });
    } catch (err) {
      await refundAiUsage({
        userId: req.user.id,
        eventId: charged.eventId,
        cost: charged.cost,
        fallback: charged.fallback,
      });
      throw err;
    }
  } catch (err) {
    console.error('POST /ai/import-menu:', err?.message || err);
    const status = Number.isFinite(err?.status) ? err.status : 500;
    res.status(status).json({ message: err?.message || 'AI menu import failed' });
  }
});

module.exports = router;
