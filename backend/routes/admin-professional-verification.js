'use strict';

const express = require('express');
const authMiddleware = require('../middleware/auth');
const { getSupabaseAdmin } = require('../lib/supabase');
const { isUuid } = require('../lib/public-listings/query-helpers');
const {
  formatVerificationRequest,
  reviewVerificationRequest,
} = require('../lib/professional-verification');

const router = express.Router();

function requirePlatformAdmin(req, res, next) {
  if (!req.admin || req.admin.constructor.modelName !== 'Admin') {
    return res.status(403).json({ message: 'Vetëm administratorët e platformës.' });
  }
  next();
}

router.get('/', authMiddleware, requirePlatformAdmin, async (req, res) => {
  try {
    const status = String(req.query.status ?? 'pending').trim();
    let q = getSupabaseAdmin()
      .from('professional_verification_requests')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);
    if (status !== 'all') q = q.eq('status', status);
    const { data, error } = await q;
    if (error) throw error;
    res.json({ requests: (data || []).map(formatVerificationRequest) });
  } catch (err) {
    console.error('GET /admin/professional-verification:', err?.message || err);
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/:id', authMiddleware, requirePlatformAdmin, async (req, res) => {
  try {
    const id = String(req.params.id || '').trim();
    if (!isUuid(id)) return res.status(404).json({ message: 'Not found' });

    const { data: doc, error } = await getSupabaseAdmin()
      .from('professional_verification_requests')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (error) throw error;
    if (!doc) return res.status(404).json({ message: 'Not found' });
    res.json({ request: formatVerificationRequest(doc) });
  } catch (err) {
    console.error('GET /admin/professional-verification/:id:', err?.message || err);
    res.status(500).json({ message: 'Server error' });
  }
});

router.patch('/:id', authMiddleware, requirePlatformAdmin, async (req, res) => {
  try {
    const decision = String(req.body?.decision ?? '').trim();
    if (decision !== 'approve' && decision !== 'reject') {
      return res.status(400).json({ message: 'Vendimi duhet të jetë approve ose reject.' });
    }
    const result = await reviewVerificationRequest(
      req.admin,
      req.params.id,
      decision,
      req.body?.adminNote,
    );
    if (!result.ok) return res.status(result.status).json({ message: result.message });
    res.json({ request: result.request });
  } catch (err) {
    console.error('PATCH /admin/professional-verification/:id:', err?.message || err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
