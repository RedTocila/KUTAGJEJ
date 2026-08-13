'use strict';

const express = require('express');
const authMiddleware = require('../middleware/auth');
const requirePortalUser = require('../middleware/require-portal-user');
const {
  getApplicantVerificationStatus,
  submitVerificationRequest,
} = require('../lib/job-employer-verification');

const router = express.Router();

/** GET /api/job-employer-verification/status */
router.get('/status', authMiddleware, requirePortalUser, async (req, res) => {
  try {
    const status = await getApplicantVerificationStatus(req.user);
    res.json(status);
  } catch (err) {
    console.error('GET /job-employer-verification/status:', err?.message || err);
    res.status(500).json({ message: 'Server error' });
  }
});

/** POST /api/job-employer-verification/request */
router.post('/request', authMiddleware, requirePortalUser, async (req, res) => {
  try {
    const result = await submitVerificationRequest(req.user, {
      message: req.body?.message,
      idNumber: req.body?.idNumber,
      idFrontImageUrl: req.body?.idFrontImageUrl,
      phone: req.body?.phone,
      nipt: req.body?.nipt,
    });
    if (!result.ok) return res.status(result.status).json({ message: result.message });
    res.status(201).json({ request: result.request });
  } catch (err) {
    console.error('POST /job-employer-verification/request:', err?.message || err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
