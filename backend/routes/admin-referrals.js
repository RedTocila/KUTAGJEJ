const express = require('express');
const mongoose = require('mongoose');
const auth = require('../middleware/auth');
const IndividualUser = require('../models/IndividualUser');
const BusinessUser = require('../models/BusinessUser');
const ReferralSignup = require('../models/ReferralSignup');
const {
  loadPortalUserBrief,
  buildReferralLink,
  countFreeReferrals,
} = require('../lib/referrals');

const router = express.Router();

function requirePlatformAdmin(req, res, next) {
  if (!req.admin || req.admin.constructor.modelName !== 'Admin') {
    return res.status(403).json({ message: 'Vetëm administratorët e platformës mund ta përdorin këtë funksion.' });
  }
  next();
}

router.use(auth, requirePlatformAdmin);

/** GET /api/admin/referrals/overview */
router.get('/overview', async (_req, res) => {
  try {
    const [indReferred, busReferred] = await Promise.all([
      IndividualUser.countDocuments({ referredById: { $ne: null } }),
      BusinessUser.countDocuments({ referredById: { $ne: null } }),
    ]);
    const referredUsersCount = indReferred + busReferred;

    const [totalSignups, creditsAgg, referrersCount] = await Promise.all([
      ReferralSignup.countDocuments({ kind: 'free-signup' }),
      ReferralSignup.aggregate([{ $group: { _id: null, total: { $sum: '$creditsAwarded' } } }]),
      ReferralSignup.distinct('referrerId', { kind: 'free-signup' }),
    ]);

    res.json({
      overview: {
        totalSignups,
        totalCreditsAwarded: creditsAgg[0]?.total ?? 0,
        uniqueReferrers: referrersCount.length,
        usersReferred: referredUsersCount,
      },
    });
  } catch (err) {
    console.error('GET /admin/referrals/overview:', err?.message || err);
    res.status(500).json({ message: 'Gabim serveri.' });
  }
});

/** GET /api/admin/referrals/signups?page&limit */
router.get('/signups', async (req, res) => {
  try {
    const page = Math.max(1, parseInt(String(req.query.page ?? '1'), 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(String(req.query.limit ?? '30'), 10) || 30));
    const skip = (page - 1) * limit;

    const [rows, total] = await Promise.all([
      ReferralSignup.find({ kind: 'free-signup' }).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      ReferralSignup.countDocuments({ kind: 'free-signup' }),
    ]);

    const signups = await Promise.all(
      rows.map(async (s) => ({
        id: String(s._id),
        referrer: await loadPortalUserBrief(s.referrerId, s.referrerModel),
        referredUser: await loadPortalUserBrief(s.referredUserId, s.referredUserModel),
        creditsAwarded: s.creditsAwarded ?? 0,
        referralCodeUsed: s.referralCodeUsed || '',
        createdAt: s.createdAt,
      })),
    );

    res.json({ signups, page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) });
  } catch (err) {
    console.error('GET /admin/referrals/signups:', err?.message || err);
    res.status(500).json({ message: 'Gabim serveri.' });
  }
});

/** GET /api/admin/referrals/users?page&limit&filter=all|referrers|referred */
router.get('/users', async (req, res) => {
  try {
    const page = Math.max(1, parseInt(String(req.query.page ?? '1'), 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(String(req.query.limit ?? '30'), 10) || 30));
    const filter = String(req.query.filter ?? 'all');
    const skip = (page - 1) * limit;

    const [individuals, businesses] = await Promise.all([
      IndividualUser.find().select('-password').lean(),
      BusinessUser.find().select('-password').lean(),
    ]);

    let rows = [
      ...individuals.map((u) => ({ ...u, accountKind: 'individual', userModel: 'IndividualUser' })),
      ...businesses.map((u) => ({ ...u, accountKind: 'business', userModel: 'BusinessUser' })),
    ];

    if (filter === 'referrers') {
      const referrerIds = new Set(
        (await ReferralSignup.distinct('referrerId', { kind: 'free-signup' })).map(String),
      );
      rows = rows.filter((u) => referrerIds.has(String(u._id)));
    } else if (filter === 'referred') {
      rows = rows.filter((u) => u.referredById);
    }

    rows.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    const total = rows.length;
    const pageRows = rows.slice(skip, skip + limit);

    const users = await Promise.all(
      pageRows.map(async (u) => {
        const referralCount = await countFreeReferrals(u._id, u.userModel);
        const referredBy =
          u.referredById && u.referredByModel
            ? await loadPortalUserBrief(u.referredById, u.referredByModel)
            : null;
        const displayName =
          u.accountKind === 'business'
            ? (u.businessName && String(u.businessName).trim()) ||
              (u.businessOwner && String(u.businessOwner).trim()) ||
              `${u.firstName || ''} ${u.lastName || ''}`.replace(/\s+/g, ' ').trim() ||
              u.email
            : `${u.firstName || ''} ${u.lastName || ''}`.replace(/\s+/g, ' ').trim() || u.email;

        return {
          id: String(u._id),
          accountKind: u.accountKind,
          email: u.email,
          displayName,
          referralCode: u.referralCode || null,
          referralLink: u.referralCode ? buildReferralLink(u.referralCode) : null,
          referralCount,
          boostCredits: u.boostCredits ?? 0,
          referredBy,
          createdAt: u.createdAt,
        };
      }),
    );

    res.json({ users, page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) });
  } catch (err) {
    console.error('GET /admin/referrals/users:', err?.message || err);
    res.status(500).json({ message: 'Gabim serveri.' });
  }
});

/** GET /api/admin/referrals/users/:id — detail for one portal user */
router.get('/users/:id', async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: 'ID e pavlefshme.' });
    }
    let user = await IndividualUser.findById(req.params.id).select('-password');
    let userModel = 'IndividualUser';
    let accountKind = 'individual';
    if (!user) {
      user = await BusinessUser.findById(req.params.id).select('-password');
      userModel = 'BusinessUser';
      accountKind = 'business';
    }
    if (!user) return res.status(404).json({ message: 'Përdoruesi nuk u gjet.' });

    const referralCount = await countFreeReferrals(user._id, userModel);
    const referredBy =
      user.referredById && user.referredByModel
        ? await loadPortalUserBrief(user.referredById, user.referredByModel)
        : null;

    const signupsAsReferrer = await ReferralSignup.find({
      referrerId: user._id,
      referrerModel: userModel,
    })
      .sort({ createdAt: -1 })
      .lean();

    const referredUsers = await Promise.all(
      signupsAsReferrer.map(async (s) => ({
        id: String(s._id),
        user: await loadPortalUserBrief(s.referredUserId, s.referredUserModel),
        creditsAwarded: s.creditsAwarded ?? 0,
        createdAt: s.createdAt,
      })),
    );

    const displayName =
      accountKind === 'business'
        ? (user.businessName && String(user.businessName).trim()) ||
          (user.businessOwner && String(user.businessOwner).trim()) ||
          `${user.firstName || ''} ${user.lastName || ''}`.replace(/\s+/g, ' ').trim() ||
          user.email
        : `${user.firstName || ''} ${user.lastName || ''}`.replace(/\s+/g, ' ').trim() || user.email;

    res.json({
      user: {
        id: String(user._id),
        accountKind,
        email: user.email,
        displayName,
        referralCode: user.referralCode || null,
        referralLink: user.referralCode ? buildReferralLink(user.referralCode) : null,
        referralCount,
        boostCredits: user.boostCredits ?? 0,
        tiersClaimed: user.referralTiersClaimed || [],
        referredBy,
        referredUsers,
        createdAt: user.createdAt,
      },
    });
  } catch (err) {
    console.error('GET /admin/referrals/users/:id:', err?.message || err);
    res.status(500).json({ message: 'Gabim serveri.' });
  }
});

module.exports = router;
