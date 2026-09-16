'use strict';

const express = require('express');
const authMiddleware = require('../middleware/auth');
const requirePortalUser = require('../middleware/require-portal-user');
const rateLimit = require('../middleware/rate-limit');
const { getSupabaseAdmin } = require('../lib/supabase');

const router = express.Router();

const deleteRateLimit = rateLimit({ windowMs: 60_000, max: 5 });

/**
 * POST /api/account/delete
 * Body: { confirmEmail: string }
 * Permanently deletes the authenticated portal user (Auth + profile cascade).
 * Required for App Store / Play Store account-deletion compliance.
 */
router.post('/delete', authMiddleware, requirePortalUser, deleteRateLimit, async (req, res) => {
  try {
    const userId = req.user?.id;
    const userEmail = String(req.user?.email || '')
      .toLowerCase()
      .trim();
    const confirmEmail = String(req.body?.confirmEmail || '')
      .toLowerCase()
      .trim();

    if (!userId || !userEmail) {
      return res.status(401).json({ message: 'Duhet të jeni të identifikuar.' });
    }
    if (!confirmEmail) {
      return res.status(400).json({ message: 'Shkruani emailin për të konfirmuar fshirjen.' });
    }
    if (confirmEmail !== userEmail) {
      return res.status(400).json({ message: 'Emaili i konfirmimit nuk përputhet me llogarinë tuaj.' });
    }

    const { error } = await getSupabaseAdmin().auth.admin.deleteUser(userId);
    if (error) {
      console.error('POST /account/delete:', error.message || error);
      return res.status(500).json({ message: 'Fshirja e llogarisë dështoi. Provoni përsëri ose kontaktoni suportin.' });
    }

    return res.json({
      ok: true,
      message: 'Llogaria u fshi. Mund të mbyllni aplikacionin.',
    });
  } catch (err) {
    console.error('POST /account/delete:', err?.message || err);
    return res.status(500).json({ message: 'Fshirja e llogarisë dështoi.' });
  }
});

module.exports = router;
