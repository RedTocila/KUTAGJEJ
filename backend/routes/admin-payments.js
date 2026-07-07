const express = require('express');
const Payment = require('../models/Payment');
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
    id: String(doc._id),
    payer: {
      id: String(doc.payerId),
      model: doc.payerModel,
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
    const query = {};
    if (['pending', 'paid', 'failed', 'canceled'].includes(String(status))) {
      query.status = String(status);
    }
    if (['subscription', 'credits'].includes(String(type))) {
      query.type = String(type);
    }

    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 25));
    const skip = (page - 1) * limit;

    const [docs, total, paidAgg] = await Promise.all([
      Payment.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      Payment.countDocuments(query),
      Payment.aggregate([
        { $match: { status: 'paid' } },
        { $group: { _id: '$currency', total: { $sum: '$amount' }, count: { $sum: 1 } } },
      ]),
    ]);

    const revenueByCurrency = paidAgg.map((r) => ({
      currency: r._id || 'EUR',
      total: Math.round(r.total * 100) / 100,
      count: r.count,
    }));

    res.json({
      payments: docs.map(formatAdminPayment),
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
