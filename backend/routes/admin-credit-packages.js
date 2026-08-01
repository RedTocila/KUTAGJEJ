const express = require('express');
const mongoose = require('mongoose');
const CreditPackage = require('../models/CreditPackage');
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
    id: String(doc._id),
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
    const docs = await CreditPackage.find().sort({ sortOrder: 1, createdAt: 1 }).lean();
    res.json({ packages: docs.map(formatAdmin) });
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

    const doc = await CreditPackage.create({
      credits: c.n,
      bonusCredits: bonus.n,
      priceEur: p.n,
      labelSq: label,
      badgeSq: badgeSq !== undefined ? String(badgeSq).trim() : '',
      active: active === undefined ? true : Boolean(active),
      sortOrder: Number.isFinite(Number(sortOrder)) ? Number(sortOrder) : 0,
      createdBy: req.admin._id,
    });
    res.status(201).json({ package: formatAdmin(doc) });
  } catch (error) {
    console.error('POST /admin/credit-packages:', error?.message || error);
    res.status(500).json({ message: 'Gabim serveri.' });
  }
});

router.patch('/:id', async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: 'ID e pavlefshme.' });
    }
    const doc = await CreditPackage.findById(req.params.id);
    if (!doc) return res.status(404).json({ message: 'Paketa nuk u gjet.' });

    const { credits, bonusCredits, priceEur, labelSq, badgeSq, active, sortOrder } = req.body || {};

    if (credits !== undefined) {
      const c = parsePositiveInt(credits, 'Kreditet');
      if (!c.ok) return res.status(400).json({ message: c.message });
      doc.credits = c.n;
    }
    if (bonusCredits !== undefined) {
      const bonus = parseNonNegative(bonusCredits, 'Bonusi');
      if (!bonus.ok) return res.status(400).json({ message: bonus.message });
      if (!Number.isInteger(bonus.n)) {
        return res.status(400).json({ message: 'Bonusi duhet të jetë numër i plotë ≥ 0.' });
      }
      doc.bonusCredits = bonus.n;
    }
    if (priceEur !== undefined) {
      const p = parseNonNegative(priceEur, 'Çmimi');
      if (!p.ok) return res.status(400).json({ message: p.message });
      doc.priceEur = p.n;
    }
    if (labelSq !== undefined) {
      const label = String(labelSq).trim();
      if (!label) return res.status(400).json({ message: 'Etiketa nuk mund të jetë bosh.' });
      doc.labelSq = label;
    }
    if (badgeSq !== undefined) doc.badgeSq = String(badgeSq).trim();
    if (active !== undefined) doc.active = Boolean(active);
    if (sortOrder !== undefined && Number.isFinite(Number(sortOrder))) doc.sortOrder = Number(sortOrder);

    await doc.save();
    res.json({ package: formatAdmin(doc) });
  } catch (error) {
    console.error('PATCH /admin/credit-packages/:id:', error?.message || error);
    res.status(500).json({ message: 'Gabim serveri.' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: 'ID e pavlefshme.' });
    }
    const doc = await CreditPackage.findByIdAndDelete(req.params.id);
    if (!doc) return res.status(404).json({ message: 'Paketa nuk u gjet.' });
    res.json({ message: 'Paketa u fshi.' });
  } catch (error) {
    console.error('DELETE /admin/credit-packages/:id:', error?.message || error);
    res.status(500).json({ message: 'Gabim serveri.' });
  }
});

module.exports = router;
