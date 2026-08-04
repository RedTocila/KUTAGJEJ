'use strict';

const express = require('express');
const { isOpenAiConfigured, runAiSearch } = require('../lib/ai-search');

const router = express.Router();

/** POST /api/public/ai-search — ChatGPT-style listing search. */
router.post('/', async (req, res) => {
  try {
    if (!isOpenAiConfigured()) {
      res.status(503).json({ message: 'AI search is not configured' });
      return;
    }

    const query = String(req.body?.query ?? req.body?.q ?? '').trim();
    if (!query) {
      res.status(400).json({ message: 'query is required' });
      return;
    }
    if (query.length > 500) {
      res.status(400).json({ message: 'query is too long' });
      return;
    }

    const language = String(req.body?.language ?? 'sq').trim() === 'en' ? 'en' : 'sq';
    const limit = req.body?.limit;
    const interpretOnly = Boolean(req.body?.interpretOnly);

    const result = await runAiSearch({ query, language, limit, interpretOnly });
    res.json({
      ok: true,
      reply: result.reply,
      intent: result.intent,
      items: result.items,
      total: result.total,
    });
  } catch (err) {
    console.error('POST /public/ai-search:', err?.message || err);
    const status = Number.isFinite(err?.status) ? err.status : 500;
    res.status(status).json({
      message: err?.message || 'AI search failed',
    });
  }
});

module.exports = router;
