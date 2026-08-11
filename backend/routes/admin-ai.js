'use strict';

const express = require('express');
const authMiddleware = require('../middleware/auth');
const rateLimit = require('../middleware/rate-limit');
const { isOpenAiConfigured, runAdminAiChat, confirmAdminAiAction } = require('../lib/admin-ai-chat');
const { getSupabaseAdmin } = require('../lib/supabase');

const router = express.Router();
const chatLimit = rateLimit({ windowMs: 60_000, max: 30 });

function requirePlatformAdmin(req, res, next) {
  if (!req.admin || req.admin.constructor.modelName !== 'Admin') {
    return res.status(403).json({ message: 'Vetëm administratorët e platformës mund ta përdorin këtë funksion.' });
  }
  next();
}

router.use(authMiddleware, requirePlatformAdmin);

router.get('/status', (_req, res) => {
  res.json({ configured: isOpenAiConfigured() });
});

router.get('/actions', async (req, res) => {
  try {
    const limit = Math.min(40, Math.max(1, Number(req.query.limit) || 20));
    const { data, error } = await getSupabaseAdmin()
      .from('admin_ai_actions')
      .select('id, admin_email, tool, args, ok, created_at')
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) {
      if (/admin_ai_actions/i.test(String(error.message || ''))) {
        return res.json({ actions: [], warning: 'Tabela e auditit mungon.' });
      }
      throw error;
    }
    res.json({ actions: data || [] });
  } catch (err) {
    console.error('GET /admin/ai/actions:', err?.message || err);
    res.status(500).json({ message: 'Gabim serveri.' });
  }
});

router.post('/chat', chatLimit, async (req, res) => {
  try {
    if (!isOpenAiConfigured()) {
      return res.status(503).json({ message: 'AI nuk është konfiguruar (OPENAI_API_KEY).' });
    }

    const confirmAction = req.body?.confirmAction;
    if (confirmAction && typeof confirmAction === 'object' && confirmAction.name) {
      const result = await confirmAdminAiAction({
        action: confirmAction,
        messages: req.body?.messages,
        admin: req.admin,
      });
      return res.json({
        ok: result.result?.ok !== false,
        reply: result.reply,
        toolsUsed: result.toolsUsed,
        pendingAction: null,
      });
    }

    const result = await runAdminAiChat({
      messages: req.body?.messages,
      admin: req.admin,
    });
    res.json({
      ok: true,
      reply: result.reply,
      toolsUsed: result.toolsUsed,
      pendingAction: result.pendingAction || null,
    });
  } catch (err) {
    console.error('POST /admin/ai/chat:', err?.message || err);
    const status = Number.isFinite(err?.status) ? err.status : 500;
    res.status(status).json({ message: err?.message || 'AI dështoi.' });
  }
});

module.exports = router;