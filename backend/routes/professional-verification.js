'use strict';

const express = require('express');
const authMiddleware = require('../middleware/auth');
const requirePortalUser = require('../middleware/require-portal-user');
const {
  getApplicantVerificationStatus,
  submitVerificationRequest,
} = require('../lib/professional-verification');
const { isOpenAiConfigured, scanIdDocumentFront } = require('../lib/id-document-ai');

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

/** POST /api/professional-verification/scan-id-front — AI validate ID photo + OCR number. */
router.post('/scan-id-front', authMiddleware, requirePortalUser, async (req, res) => {
  try {
    if (!isOpenAiConfigured()) {
      res.status(503).json({ message: 'Skanimi me AI nuk është i disponueshëm për momentin.' });
      return;
    }

    const image = req.body?.image;
    const result = await scanIdDocumentFront(image);
    res.json(result);
  } catch (err) {
    console.error('POST /professional-verification/scan-id-front:', err?.message || err);
    res.status(err?.status || 500).json({ message: err?.message || 'Server error' });
  }
});

router.post('/request', authMiddleware, requirePortalUser, async (req, res) => {
  try {
    const result = await submitVerificationRequest(req.user, {
      message: req.body?.message,
      idNumber: req.body?.idNumber,
      idFrontImageUrl: req.body?.idFrontImageUrl,
      nipt: req.body?.nipt,
    });
    if (!result.ok) return res.status(result.status).json({ message: result.message });
    res.status(201).json({ request: result.request });
  } catch (err) {
    console.error('POST /professional-verification/request:', err?.message || err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
