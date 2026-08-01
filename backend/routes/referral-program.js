'use strict';

const express = require('express');
const { getSupabaseAdmin } = require('../lib/supabase');
const { ensureReferralProgram, formatReferralProgram } = require('../lib/ensure-referral-program');

const router = express.Router();

router.get('/', async (_req, res) => {
  try {
    await ensureReferralProgram();
    const { data, error } = await getSupabaseAdmin()
      .from('referral_programs')
      .select('*')
      .eq('id', 'default')
      .maybeSingle();
    if (error) throw error;
    if (!data) {
      return res.status(500).json({ message: 'Programi i referimit nuk u inicializua.' });
    }
    res.json({ program: formatReferralProgram(data) });
  } catch (error) {
    console.error('GET /referral-program:', error?.message || error);
    res.status(500).json({ message: 'Gabim serveri.' });
  }
});

module.exports = router;
