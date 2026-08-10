'use strict';

const express = require('express');
const { getSupabaseAdmin } = require('../lib/supabase');
const { mapPayment } = require('../lib/apply-payment');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

function requirePlatformAdmin(req, res, next) {
  if (!req.admin || req.admin.constructor.modelName !== 'Admin') {
    return res.status(403).json({ message: 'Vetëm administratorët e platformës mund ta përdorin këtë funksion.' });
  }
  next();
}

function formatAdminPayment(doc) {
  return {
    id: String(doc.id || doc._id),
    payer: {
      id: String(doc.payerId),
      model: doc.metadata?.payerModel || null,
      email: doc.payerEmail || '',
      name: doc.payerName || '',
    },
    type: doc.type,
    description: doc.description || '',
    amount: doc.amount,
    currency: doc.currency,
    status: doc.status,
    granted: Boolean(doc.granted),
    pokEnv: doc.pokEnv,
    pokOrderId: doc.pokOrderId || null,
    pokStatus: doc.pokStatus || null,
    metadata: {
      contractTitle: doc.metadata?.contractTitle || null,
      months: doc.metadata?.months ?? null,
      creditPackageId: doc.metadata?.creditPackageId || null,
      credits: doc.metadata?.credits ?? null,
    },
    paidAt: doc.paidAt,
    createdAt: doc.createdAt,
  };
}

router.use(authMiddleware, requirePlatformAdmin);

/**
 * All payments across the platform. Supports ?status=, ?type=, and pagination
 * (?page=, ?limit=). Also returns aggregate totals for paid revenue.
 */
router.get('/', async (req, res) => {
  try {
    const { status, type } = req.query;
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 25));
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    const sb = getSupabaseAdmin();
    let query = sb.from('payments').select('*', { count: 'exact' });
    if (['pending', 'paid', 'failed', 'canceled'].includes(String(status))) {
      query = query.eq('status', String(status));
    }
    if (['subscription', 'credits', 'auto-refresh', 'premium', 'okazion'].includes(String(type))) {
      query = query.eq('type', String(type));
    }

    const { data, error, count } = await query
      .order('created_at', { ascending: false })
      .range(from, to);
    if (error) throw error;

    const { data: paidRows, error: paidErr } = await sb
      .from('payments')
      .select('amount, currency')
      .eq('status', 'paid');
    if (paidErr) throw paidErr;

    const byCurrency = new Map();
    for (const r of paidRows || []) {
      const cur = r.currency || 'EUR';
      const entry = byCurrency.get(cur) || { currency: cur, total: 0, count: 0 };
      entry.total += Number(r.amount) || 0;
      entry.count += 1;
      byCurrency.set(cur, entry);
    }
    const revenueByCurrency = [...byCurrency.values()].map((r) => ({
      currency: r.currency,
      total: Math.round(r.total * 100) / 100,
      count: r.count,
    }));

    const total = count ?? 0;
    res.json({
      payments: (data || []).map(mapPayment).map(formatAdminPayment),
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
      revenueByCurrency,
    });
  } catch (error) {
    console.error('GET /admin/payments:', error?.message || error);
    res.status(500).json({ message: 'Gabim serveri.' });
  }
});

module.exports = router;
