const express = require('express');
const auth = require('../middleware/auth');
const requirePortalUser = require('../middleware/require-portal-user');
const ReferralSignup = require('../models/ReferralSignup');
const ReferralProgram = require('../models/ReferralProgram');
const { ensureReferralProgram, formatReferralProgram } = require('../lib/ensure-referral-program');
const {
  ensureUserReferralCode,
  buildReferralLink,
  countFreeReferrals,
  loadPortalUserBrief,
} = require('../lib/referrals');

const router = express.Router();

/** GET /api/referrals/me — portal user's referral stats + link */
router.get('/me', auth, requirePortalUser, async (req, res) => {
  try {
    const user = req.user;
    await ensureUserReferralCode(user);
    const code = user.referralCode;
    const referralCount = await countFreeReferrals(user._id, user.constructor.modelName);

    const referredBy =
      user.referredById && user.referredByModel
        ? await loadPortalUserBrief(user.referredById, user.referredByModel)
        : null;

    const signups = await ReferralSignup.find({
      referrerId: user._id,
      referrerModel: user.constructor.modelName,
    })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    const referredUsers = await Promise.all(
      signups.map(async (s) => {
        const brief = await loadPortalUserBrief(s.referredUserId, s.referredUserModel);
        return {
          id: String(s._id),
          referredUser: brief,
          creditsAwarded: s.creditsAwarded ?? 0,
          referralCodeUsed: s.referralCodeUsed || code,
          createdAt: s.createdAt,
        };
      }),
    );

    await ensureReferralProgram();
    const programDoc = await ReferralProgram.findById('default');
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
        boostCredits: user.boostCredits ?? 0,
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
      },
      program,
    });
  } catch (err) {
    console.error('GET /referrals/me:', err?.message || err);
    res.status(500).json({ message: 'Gabim serveri.' });
  }
});

module.exports = router;
