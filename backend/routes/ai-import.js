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
const { getAiImportQuota, consumeAiImportQuota } = require('../lib/ai-import-quota');

const router = express.Router();

function quotaPayload(quota) {
  return {
    planCode: quota.planCode,
    unlimited: quota.unlimited,
    limit: quota.limit,
    used: quota.used,
    remaining: quota.remaining,
    usedOn: quota.usedOn,
  };
}

/** GET /api/ai/import-quota — remaining AI Builds for today. */
router.get('/import-quota', authMiddleware, requirePortalUser, async (req, res) => {
  try {
    const quota = await getAiImportQuota(req.user.id);
    res.json({ ok: true, quota: quotaPayload(quota) });
  } catch (err) {
    console.error('GET /ai/import-quota:', err?.message || err);
    res.status(500).json({ message: err?.message || 'Failed to load AI quota' });
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
    const images = Array.isArray(req.body?.images) ? req.body.images : [];
    const profile = req.body?.profile && typeof req.body.profile === 'object' ? req.body.profile : null;
    const currentListing =
      req.body?.currentListing && typeof req.body.currentListing === 'object'
        ? req.body.currentListing
        : null;

    if (!urls.length && !text && !images.length) {
      res.status(400).json({ message: 'Paste a link, describe the listing, or attach images' });
      return;
    }

    const consumed = await consumeAiImportQuota(req.user.id);
    if (!consumed.ok) {
      res.status(consumed.status).json({
        message: consumed.message,
        code: consumed.code,
        quota: quotaPayload(consumed.quota),
      });
      return;
    }

    const result = await importListingsFromLinks({
      urls,
      text,
      category,
      profile,
      images,
      mode,
      currentListing,
    });
    res.json({ ok: true, drafts: result.drafts, quota: quotaPayload(consumed.quota) });
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
    const consumed = await consumeAiImportQuota(req.user.id);
    if (!consumed.ok) {
      res.status(consumed.status).json({
        message: consumed.message,
        code: consumed.code,
        quota: quotaPayload(consumed.quota),
      });
      return;
    }

    const result = await importMenuFromImages({ images });
    res.json({
      ok: true,
      categories: result.categories,
      items: result.items,
      quota: quotaPayload(consumed.quota),
    });
  } catch (err) {
    console.error('POST /ai/import-menu:', err?.message || err);
    const status = Number.isFinite(err?.status) ? err.status : 500;
    res.status(status).json({ message: err?.message || 'AI menu import failed' });
  }
});

module.exports = router;
