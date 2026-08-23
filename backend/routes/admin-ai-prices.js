'use strict';

const express = require('express');
const authMiddleware = require('../middleware/auth');
const {
  getAiUsagePrices,
  saveAiUsagePrices,
  publicCosts,
  isMissingPricesTable,
} = require('../lib/ai-usage-prices');

const router = express.Router();

function requirePlatformAdmin(req, res, next) {
  if (!req.admin || req.admin.constructor.modelName !== 'Admin') {
    return res.status(403).json({ message: 'Vetëm administratorët e platformës mund ta përdorin këtë funksion.' });
  }
  next();
}

function missingTableResponse(res) {
  return res.status(503).json({
    message:
      'Tabela e çmimeve AI mungon. Aplikoni supabase/migrations/20260823150000_ai_usage_prices.sql në Supabase SQL Editor.',
  });
}

router.use(authMiddleware, requirePlatformAdmin);

router.get('/', async (_req, res) => {
  try {
    const prices = await getAiUsagePrices();
    res.json({ prices: publicCosts(prices) });
  } catch (error) {
    if (isMissingPricesTable(error)) return missingTableResponse(res);
    console.error('GET /admin/ai-prices:', error?.message || error);
    res.status(500).json({ message: 'Gabim serveri.' });
  }
});

router.put('/', async (req, res) => {
  try {
    const body = req.body || {};
    const prices = await saveAiUsagePrices(
      {
        aiBuildPerLink: body.aiBuildPerLink,
        aiAssist: body.aiAssist ?? body.other,
        aiMenuPerImage: body.aiMenuPerImage,
        aiSearch: body.aiSearch,
      },
      { updatedBy: req.user?.id || req.admin?.id || null },
    );
    res.json({ prices: publicCosts(prices) });
  } catch (error) {
    if (isMissingPricesTable(error)) return missingTableResponse(res);
    console.error('PUT /admin/ai-prices:', error?.message || error);
    res.status(500).json({ message: 'Gabim serveri.' });
  }
});

module.exports = router;
