'use strict';

const express = require('express');
const authMiddleware = require('../middleware/auth');
const requirePortalUser = require('../middleware/require-portal-user');
const {
  getApplicantVerificationStatus,
  submitVerificationRequest,
} = require('../lib/professional-verification');

const router = express.Router();

router.get('/status', authMiddleware, requirePortalUser, async (req, res) => {
  try {
    const status = await getApplicantVerificationStatus(req.user);
    res.json(status);
  } catch (err) {
    console.error('GET /professional-verification/status:', err?.message || err);
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/request', authMiddleware, requirePortalUser, async (req, res) => {
  try {
    const result = await submitVerificationRequest(req.user, req.body?.message);
    if (!result.ok) return res.status(result.status).json({ message: result.message });
    res.status(201).json({ request: result.request });
  } catch (err) {
    console.error('POST /professional-verification/request:', err?.message || err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
