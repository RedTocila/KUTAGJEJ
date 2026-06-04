const express = require('express');
const JobEmployerVerificationRequest = require('../models/JobEmployerVerificationRequest');
const authMiddleware = require('../middleware/auth');
const {
  formatVerificationRequest,
  reviewVerificationRequest,
} = require('../lib/job-employer-verification');

const router = express.Router();

function requirePlatformAdmin(req, res, next) {
  if (!req.admin || req.admin.constructor.modelName !== 'Admin') {
    return res.status(403).json({ message: 'Vetëm administratorët e platformës.' });
  }
  next();
}

/** GET /api/admin/job-employer-verification?status=pending */
router.get('/', authMiddleware, requirePlatformAdmin, async (req, res) => {
  try {
    const status = String(req.query.status ?? 'pending').trim();
    const filter = status === 'all' ? {} : { status };
    const docs = await JobEmployerVerificationRequest.find(filter).sort({ createdAt: -1 }).limit(100).lean();
    res.json({ requests: docs.map(formatVerificationRequest) });
  } catch (err) {
    console.error('GET /admin/job-employer-verification:', err?.message || err);
    res.status(500).json({ message: 'Server error' });
  }
});

/** GET /api/admin/job-employer-verification/:id */
router.get('/:id', authMiddleware, requirePlatformAdmin, async (req, res) => {
  try {
    const doc = await JobEmployerVerificationRequest.findById(req.params.id).lean();
    if (!doc) return res.status(404).json({ message: 'Not found' });
    res.json({ request: formatVerificationRequest(doc) });
  } catch (err) {
    console.error('GET /admin/job-employer-verification/:id:', err?.message || err);
    res.status(500).json({ message: 'Server error' });
  }
});

/** PATCH /api/admin/job-employer-verification/:id — body: { decision: 'approve'|'reject', adminNote? } */
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
    console.error('PATCH /admin/job-employer-verification/:id:', err?.message || err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
