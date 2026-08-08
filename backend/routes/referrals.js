'use strict';

const express = require('express');
const { getSupabaseAdmin } = require('../lib/supabase');
const auth = require('../middleware/auth');
const requirePortalUser = require('../middleware/require-portal-user');
const { ensureReferralProgram, formatReferralProgram } = require('../lib/ensure-referral-program');
const {
  ensureUserReferralCode,
  buildReferralLink,
  countFreeReferrals,
  countPaidReferrals,
  getReceivedReviewStats,
  loadPortalUserBrief,
} = require('../lib/referrals');
const { recordLoginStreak } = require('../lib/login-streak');

const router = express.Router();

/** GET /api/referrals/me — portal user's referral stats + link */
router.get('/me', auth, requirePortalUser, async (req, res) => {
  try {
    const user = req.user;
    await ensureUserReferralCode(user);
    const loginStreak = await recordLoginStreak(user);
    const code = user.referralCode;
    const posterModel = user.constructor.modelName;
    const [referralCount, paidReferralCount, reviewStats] = await Promise.all([
      countFreeReferrals(user.id, posterModel),
      countPaidReferrals(user.id, posterModel),
      getReceivedReviewStats(user.id, posterModel),
    ]);
    const reviewCount = reviewStats.reviewCount;
    const ratingAverage = reviewStats.ratingAverage;

    const referredBy = user.referredById
      ? await loadPortalUserBrief(user.referredById, null)
      : null;

    const { data: signups, error: signupErr } = await getSupabaseAdmin()
      .from('referral_signups')
      .select('*')
      .eq('referrer_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50);
    if (signupErr) throw signupErr;

    const referredUsers = await Promise.all(
      (signups || []).map(async (s) => {
        const brief = await loadPortalUserBrief(s.referred_user_id, null);
        return {
          id: String(s.id),
          referredUser: brief,
          creditsAwarded: s.credits_awarded ?? 0,
          referralCodeUsed: s.referral_code_used || code,
          createdAt: s.created_at,
        };
      }),
    );

    await ensureReferralProgram();
    const { data: programDoc, error: progErr } = await getSupabaseAdmin()
      .from('referral_programs')
      .select('*')
      .eq('id', 'default')
      .maybeSingle();
    if (progErr) throw progErr;
    const program = programDoc ? formatReferralProgram(programDoc) : null;

    const claimed = new Set((user.referralTiersClaimed || []).map(Number));
    const nextTier = (program?.freeTiers || [])
      .slice()
      .sort((a, b) => a.referralsRequired - b.referralsRequired)
      .find((t) => referralCount < t.referralsRequired && !claimed.has(t.level));

    res.json({
      referral: {
        code,
        link: buildReferralLink(code),
        referralCount,
        paidReferralCount,
        reviewCount,
        ratingAverage,
        boostCredits: loginStreak.boostCreditsBalance ?? user.boostCredits ?? 0,
        tiersClaimed: user.referralTiersClaimed || [],
        nextTier: nextTier
          ? {
              level: nextTier.level,
              title: nextTier.title,
              referralsRequired: nextTier.referralsRequired,
              boostCredits: nextTier.boostCredits,
              remaining: nextTier.referralsRequired - referralCount,
            }
          : null,
        referredBy,
        referredUsers,
        loginStreakDays: loginStreak.days,
        loginStreakDaysRequired: loginStreak.daysRequired,
        loginStreakBoostCredits: loginStreak.boostCredits,
        loginStreakCheckedInToday: loginStreak.checkedInToday,
        loginStreakAwarded: Boolean(loginStreak.awarded),
      },
      program,
    });
  } catch (err) {
    console.error('GET /referrals/me:', err?.message || err);
    res.status(500).json({ message: 'Gabim serveri.' });
  }
});

module.exports = router;
