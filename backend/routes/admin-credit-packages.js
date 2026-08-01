'use strict';

const express = require('express');
const { getSupabaseAdmin } = require('../lib/supabase');
const { mapCreditPackage } = require('../lib/credit-packages');
const { isUuid } = require('../lib/public-listings/query-helpers');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

function requirePlatformAdmin(req, res, next) {
  if (!req.admin || req.admin.constructor.modelName !== 'Admin') {
    return res.status(403).json({ message: 'Vetëm administratorët e platformës mund ta përdorin këtë funksion.' });
  }
  next();
}

function formatAdmin(doc) {
  return {
    id: String(doc.id || doc._id),
    credits: doc.credits,
    bonusCredits: Number(doc.bonusCredits) || 0,
    priceEur: doc.priceEur,
    labelSq: doc.labelSq,
    badgeSq: doc.badgeSq || '',
    active: Boolean(doc.active),
    sortOrder: doc.sortOrder ?? 0,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

function parsePositiveInt(value, label) {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 1 || !Number.isInteger(n)) {
    return { ok: false, message: `${label} duhet të jetë numër i plotë ≥ 1.` };
  }
  return { ok: true, n };
}

function parseNonNegative(value, label) {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) {
    return { ok: false, message: `${label} duhet të jetë numër ≥ 0.` };
  }
  return { ok: true, n };
}

router.use(authMiddleware, requirePlatformAdmin);

router.get('/', async (_req, res) => {
  try {
    const { data, error } = await getSupabaseAdmin()
      .from('credit_packages')
      .select('*')
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true });
    if (error) throw error;
    res.json({ packages: (data || []).map(mapCreditPackage).map(formatAdmin) });
  } catch (error) {
    console.error('GET /admin/credit-packages:', error?.message || error);
    res.status(500).json({ message: 'Gabim serveri.' });
  }
});

router.post('/', async (req, res) => {
  try {
    const { credits, bonusCredits, priceEur, labelSq, badgeSq, active, sortOrder } = req.body || {};

    const c = parsePositiveInt(credits, 'Kreditet');
    if (!c.ok) return res.status(400).json({ message: c.message });
    const bonus =
      bonusCredits === undefined || bonusCredits === null || bonusCredits === ''
        ? { ok: true, n: 0 }
        : parseNonNegative(bonusCredits, 'Bonusi');
    if (!bonus.ok) return res.status(400).json({ message: bonus.message });
    if (!Number.isInteger(bonus.n)) {
      return res.status(400).json({ message: 'Bonusi duhet të jetë numër i plotë ≥ 0.' });
    }
    const p = parseNonNegative(priceEur, 'Çmimi');
    if (!p.ok) return res.status(400).json({ message: p.message });
    const label = String(labelSq || '').trim();
    if (!label) return res.status(400).json({ message: 'Etiketa është e detyrueshme.' });

    const { data, error } = await getSupabaseAdmin()
      .from('credit_packages')
      .insert({
        credits: c.n,
        bonus_credits: bonus.n,
        price_eur: p.n,
        label_sq: label,
        badge_sq: badgeSq !== undefined ? String(badgeSq).trim() : '',
        active: active === undefined ? true : Boolean(active),
        sort_order: Number.isFinite(Number(sortOrder)) ? Number(sortOrder) : 0,
        created_by: req.admin.id,
      })
      .select('*')
      .single();
    if (error) throw error;
    res.status(201).json({ package: formatAdmin(mapCreditPackage(data)) });
  } catch (error) {
    console.error('POST /admin/credit-packages:', error?.message || error);
    res.status(500).json({ message: 'Gabim serveri.' });
  }
});

router.patch('/:id', async (req, res) => {
  try {
    if (!isUuid(req.params.id)) {
      return res.status(400).json({ message: 'ID e pavlefshme.' });
    }
    const sb = getSupabaseAdmin();
    const { data: existing, error: findErr } = await sb
      .from('credit_packages')
      .select('*')
      .eq('id', req.params.id)
      .maybeSingle();
    if (findErr) throw findErr;
    if (!existing) return res.status(404).json({ message: 'Paketa nuk u gjet.' });

    const { credits, bonusCredits, priceEur, labelSq, badgeSq, active, sortOrder } = req.body || {};
    const patch = { updated_at: new Date().toISOString() };

    if (credits !== undefined) {
      const c = parsePositiveInt(credits, 'Kreditet');
      if (!c.ok) return res.status(400).json({ message: c.message });
      patch.credits = c.n;
    }
    if (bonusCredits !== undefined) {
      const bonus = parseNonNegative(bonusCredits, 'Bonusi');
      if (!bonus.ok) return res.status(400).json({ message: bonus.message });
      if (!Number.isInteger(bonus.n)) {
        return res.status(400).json({ message: 'Bonusi duhet të jetë numër i plotë ≥ 0.' });
      }
      patch.bonus_credits = bonus.n;
    }
    if (priceEur !== undefined) {
      const p = parseNonNegative(priceEur, 'Çmimi');
      if (!p.ok) return res.status(400).json({ message: p.message });
      patch.price_eur = p.n;
    }
    if (labelSq !== undefined) {
      const label = String(labelSq).trim();
      if (!label) return res.status(400).json({ message: 'Etiketa nuk mund të jetë bosh.' });
      patch.label_sq = label;
    }
    if (badgeSq !== undefined) patch.badge_sq = String(badgeSq).trim();
    if (active !== undefined) patch.active = Boolean(active);
    if (sortOrder !== undefined && Number.isFinite(Number(sortOrder))) patch.sort_order = Number(sortOrder);

    const { data, error } = await sb
      .from('credit_packages')
      .update(patch)
      .eq('id', req.params.id)
      .select('*')
      .single();
    if (error) throw error;
    res.json({ package: formatAdmin(mapCreditPackage(data)) });
  } catch (error) {
    console.error('PATCH /admin/credit-packages/:id:', error?.message || error);
    res.status(500).json({ message: 'Gabim serveri.' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    if (!isUuid(req.params.id)) {
      return res.status(400).json({ message: 'ID e pavlefshme.' });
    }
    const { data, error } = await getSupabaseAdmin()
      .from('credit_packages')
      .delete()
      .eq('id', req.params.id)
      .select('id')
      .maybeSingle();
    if (error) throw error;
    if (!data) return res.status(404).json({ message: 'Paketa nuk u gjet.' });
    res.json({ message: 'Paketa u fshi.' });
  } catch (error) {
    console.error('DELETE /admin/credit-packages/:id:', error?.message || error);
    res.status(500).json({ message: 'Gabim serveri.' });
  }
});

module.exports = router;
