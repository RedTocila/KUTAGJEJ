'use strict';

const express = require('express');
const { getSupabaseAdmin } = require('../lib/supabase');
const { mapProfile } = require('../lib/profiles');
const { isUuid } = require('../lib/public-listings/query-helpers');
const auth = require('../middleware/auth');
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

function displayNameForProfile(u) {
  if (u.accountType === 'business' || u.accountKind === 'business') {
    return (
      (u.businessName && String(u.businessName).trim()) ||
      (u.businessOwner && String(u.businessOwner).trim()) ||
      `${u.firstName || ''} ${u.lastName || ''}`.replace(/\s+/g, ' ').trim() ||
      u.email
    );
  }
  return `${u.firstName || ''} ${u.lastName || ''}`.replace(/\s+/g, ' ').trim() || u.email;
}

router.use(auth, requirePlatformAdmin);

/** GET /api/admin/referrals/overview */
router.get('/overview', async (_req, res) => {
  try {
    const sb = getSupabaseAdmin();
    const [{ count: referredUsersCount, error: refErr }, { count: totalSignups, error: sigErr }] =
      await Promise.all([
        sb
          .from('profiles')
          .select('*', { count: 'exact', head: true })
          .in('account_type', ['individual', 'business'])
          .not('referred_by_id', 'is', null),
        sb
          .from('referral_signups')
          .select('*', { count: 'exact', head: true })
          .eq('kind', 'free-signup'),
      ]);
    if (refErr) throw refErr;
    if (sigErr) throw sigErr;

    const { data: creditRows, error: credErr } = await sb
      .from('referral_signups')
      .select('credits_awarded');
    if (credErr) throw credErr;
    const totalCreditsAwarded = (creditRows || []).reduce(
      (sum, r) => sum + (Number(r.credits_awarded) || 0),
      0,
    );

    const { data: referrerRows, error: uniqErr } = await sb
      .from('referral_signups')
      .select('referrer_id')
      .eq('kind', 'free-signup');
    if (uniqErr) throw uniqErr;
    const uniqueReferrers = new Set((referrerRows || []).map((r) => r.referrer_id)).size;

    res.json({
      overview: {
        totalSignups: totalSignups ?? 0,
        totalCreditsAwarded,
        uniqueReferrers,
        usersReferred: referredUsersCount ?? 0,
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
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    const { data: rows, error, count } = await getSupabaseAdmin()
      .from('referral_signups')
      .select('*', { count: 'exact' })
      .eq('kind', 'free-signup')
      .order('created_at', { ascending: false })
      .range(from, to);
    if (error) throw error;

    const signups = await Promise.all(
      (rows || []).map(async (s) => ({
        id: String(s.id),
        referrer: await loadPortalUserBrief(s.referrer_id, null),
        referredUser: await loadPortalUserBrief(s.referred_user_id, null),
        creditsAwarded: s.credits_awarded ?? 0,
        referralCodeUsed: s.referral_code_used || '',
        createdAt: s.created_at,
      })),
    );

    const total = count ?? 0;
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

    const sb = getSupabaseAdmin();
    const { data: profileRows, error } = await sb
      .from('profiles')
      .select('*')
      .in('account_type', ['individual', 'business']);
    if (error) throw error;

    let rows = (profileRows || []).map((r) => {
      const u = mapProfile(r);
      return {
        ...u,
        accountKind: u.accountType,
        userModel: u.constructor.modelName,
      };
    });

    if (filter === 'referrers') {
      const { data: referrerRows, error: rErr } = await sb
        .from('referral_signups')
        .select('referrer_id')
        .eq('kind', 'free-signup');
      if (rErr) throw rErr;
      const referrerIds = new Set((referrerRows || []).map((r) => String(r.referrer_id)));
      rows = rows.filter((u) => referrerIds.has(String(u.id)));
    } else if (filter === 'referred') {
      rows = rows.filter((u) => u.referredById);
    }

    rows.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    const total = rows.length;
    const pageRows = rows.slice(skip, skip + limit);

    const users = await Promise.all(
      pageRows.map(async (u) => {
        const referralCount = await countFreeReferrals(u.id, u.userModel);
        const referredBy = u.referredById ? await loadPortalUserBrief(u.referredById, null) : null;

        return {
          id: String(u.id),
          accountKind: u.accountKind,
          email: u.email,
          displayName: displayNameForProfile(u),
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
    if (!isUuid(req.params.id)) {
      return res.status(400).json({ message: 'ID e pavlefshme.' });
    }
    const sb = getSupabaseAdmin();
    const { data: row, error } = await sb
      .from('profiles')
      .select('*')
      .eq('id', req.params.id)
      .in('account_type', ['individual', 'business'])
      .maybeSingle();
    if (error) throw error;
    if (!row) return res.status(404).json({ message: 'Përdoruesi nuk u gjet.' });

    const user = mapProfile(row);
    const accountKind = user.accountType;
    const userModel = user.constructor.modelName;

    const referralCount = await countFreeReferrals(user.id, userModel);
    const referredBy = user.referredById ? await loadPortalUserBrief(user.referredById, null) : null;

    const { data: signupsAsReferrer, error: sErr } = await sb
      .from('referral_signups')
      .select('*')
      .eq('referrer_id', user.id)
      .order('created_at', { ascending: false });
    if (sErr) throw sErr;

    const referredUsers = await Promise.all(
      (signupsAsReferrer || []).map(async (s) => ({
        id: String(s.id),
        user: await loadPortalUserBrief(s.referred_user_id, null),
        creditsAwarded: s.credits_awarded ?? 0,
        createdAt: s.created_at,
      })),
    );

    res.json({
      user: {
        id: String(user.id),
        accountKind,
        email: user.email,
        displayName: displayNameForProfile({ ...user, accountKind }),
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
