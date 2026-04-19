const express = require('express');
const ReferralProgram = require('../models/ReferralProgram');
const { ensureReferralProgram, formatReferralProgram } = require('../lib/ensure-referral-program');

const router = express.Router();

router.get('/', async (_req, res) => {
  try {
    await ensureReferralProgram();
    const doc = await ReferralProgram.findById('default');
    if (!doc) {
      return res.status(500).json({ message: 'Programi i referimit nuk u inicializua.' });
    }
    res.json({ program: formatReferralProgram(doc) });
  } catch (error) {
    console.error('GET /referral-program:', error?.message || error);
    res.status(500).json({ message: 'Gabim serveri.' });
  }
});

module.exports = router;
