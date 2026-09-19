'use strict';

const express = require('express');
const authMiddleware = require('../middleware/auth');
const requirePortalUser = require('../middleware/require-portal-user');
const rateLimit = require('../middleware/rate-limit');
const { getSupabaseAdmin } = require('../lib/supabase');

const router = express.Router();

const deleteRateLimit = rateLimit({ windowMs: 60_000, max: 5 });

/** Exact phrases required to confirm self-service account deletion (case-sensitive). */
const DELETE_CONFIRM_PHRASES = new Set(['DOREZOHEM!', 'GIVE UP!']);

/**
 * POST /api/account/delete
 * Body: { confirmPhrase: string }  (also accepts legacy confirmEmail for older clients)
 * Permanently deletes the authenticated portal user (Auth + profile cascade).
 * Required for App Store / Play Store account-deletion compliance.
 */
router.post('/delete', authMiddleware, requirePortalUser, deleteRateLimit, async (req, res) => {
  try {
    const userId = req.user?.id;
    const userEmail = String(req.user?.email || '')
      .toLowerCase()
      .trim();
    const confirmPhrase = String(req.body?.confirmPhrase || '').trim();
    const confirmEmail = String(req.body?.confirmEmail || '')
      .toLowerCase()
      .trim();

    if (!userId || !userEmail) {
      return res.status(401).json({ message: 'Duhet të jeni të identifikuar.' });
    }

    const phraseOk = confirmPhrase && DELETE_CONFIRM_PHRASES.has(confirmPhrase);
    const emailOk = confirmEmail && confirmEmail === userEmail;
    if (!phraseOk && !emailOk) {
      if (confirmPhrase) {
        return res.status(400).json({
          message: 'Fraza e konfirmimit nuk përputhet. Shkruani DOREZOHEM! ose GIVE UP! me shkronja kapitale.',
        });
      }
      if (confirmEmail) {
        return res.status(400).json({ message: 'Emaili i konfirmimit nuk përputhet me llogarinë tuaj.' });
      }
      return res.status(400).json({
        message: 'Shkruani frazën e konfirmimit (DOREZOHEM! ose GIVE UP!) për të fshirë llogarinë.',
      });
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
