'use strict';

const express = require('express');
const { getSupabaseAdmin } = require('../lib/supabase');
const authMiddleware = require('../middleware/auth');
const { ensureReferralProgram, formatReferralProgram } = require('../lib/ensure-referral-program');

const router = express.Router();

function requirePlatformAdmin(req, res, next) {
  if (!req.admin || req.admin.constructor.modelName !== 'Admin') {
    return res.status(403).json({ message: 'Vetëm administratorët e platformës mund ta përdorin këtë funksion.' });
  }
  next();
}

function num(v, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function str(v, fallback = '') {
  if (v === undefined || v === null) return fallback;
  return String(v).trim();
}

function parseBody(body) {
  const err = (msg) => ({ error: msg });

  if (!body || typeof body !== 'object') return err('Trupi i kërkesës është i pavlefshëm.');

  const freeTiers = Array.isArray(body.freeTiers) ? body.freeTiers : null;
  const paidTiers = Array.isArray(body.paidTiers) ? body.paidTiers : null;
  const reviewMilestones = Array.isArray(body.reviewMilestones) ? body.reviewMilestones : null;

  if (!freeTiers) return err('freeTiers duhet të jetë një listë.');
  if (!paidTiers) return err('paidTiers duhet të jetë një listë.');
  if (!reviewMilestones) return err('reviewMilestones duhet të jetë një listë.');

  const nextFree = [];
  for (const row of freeTiers) {
    const level = Math.max(1, Math.floor(num(row?.level, 0)));
    const title = str(row?.title);
    const referralsRequired = Math.max(0, Math.floor(num(row?.referralsRequired, 0)));
    const boostCredits = Math.max(0, Math.floor(num(row?.boostCredits, 0)));
    if (!title) return err('Çdo nivel falas duhet të ketë titull.');
    nextFree.push({ level, title, referralsRequired, boostCredits });
  }

  const nextPaid = [];
  for (const row of paidTiers) {
    const tier = Math.max(1, Math.floor(num(row?.tier, 0)));
    const title = str(row?.title);
    const paidReferralsRequired = Math.max(0, Math.floor(num(row?.paidReferralsRequired, 0)));
    const boostCredits = Math.max(0, Math.floor(num(row?.boostCredits, 0)));
    const premiumMonths = Math.max(0, Math.floor(num(row?.premiumMonths, 0)));
    const extraNote = str(row?.extraNote);
    if (!title) return err('Çdo nivel i paguar duhet të ketë titull.');
    nextPaid.push({ tier, title, paidReferralsRequired, boostCredits, premiumMonths, extraNote });
  }

  const nextReviews = [];
  for (const row of reviewMilestones) {
    const reviewsRequired = Math.max(0, Math.floor(num(row?.reviewsRequired, 0)));
    const boostCredits = Math.max(0, Math.floor(num(row?.boostCredits, 0)));
    nextReviews.push({ reviewsRequired, boostCredits });
  }

  const nb = body.networkBuilderBadge;
  if (!nb || typeof nb !== 'object') return err('networkBuilderBadge mungon.');
  const networkBuilderBadge = {
    label: str(nb.label),
    lifetimePercent: Math.max(0, num(nb.lifetimePercent, 0)),
    description: str(nb.description),
  };
  if (!networkBuilderBadge.label) return err('networkBuilderBadge.label është i detyrueshëm.');

  const rd = body.revenueDriverBadge;
  if (!rd || typeof rd !== 'object') return err('revenueDriverBadge mungon.');
  const revenueDriverBadge = {
    label: str(rd.label),
    lifetimePercent: Math.max(0, num(rd.lifetimePercent, 0)),
    description: str(rd.description),
  };
  if (!revenueDriverBadge.label) return err('revenueDriverBadge.label është i detyrueshëm.');

  const tr = body.trustedReviewerBadge;
  if (!tr || typeof tr !== 'object') return err('trustedReviewerBadge mungon.');
  const trustedReviewerBadge = {
    label: str(tr.label),
    lifetimePercent: Math.max(0, num(tr.lifetimePercent, 0)),
    reviewsRequired: Math.max(0, Math.floor(num(tr.reviewsRequired, 0))),
    description: str(tr.description),
  };
  if (!trustedReviewerBadge.label) return err('trustedReviewerBadge.label është i detyrueshëm.');

  const pd = body.platformDominatorBadge;
  if (!pd || typeof pd !== 'object') return err('platformDominatorBadge mungon.');
  const platformDominatorBadge = {
    label: str(pd.label),
    lifetimePercent: Math.max(0, num(pd.lifetimePercent, 0)),
    description: str(pd.description),
  };
  if (!platformDominatorBadge.label) return err('platformDominatorBadge.label është i detyrueshëm.');

  const ls = body.loginStreak;
  if (!ls || typeof ls !== 'object') return err('loginStreak mungon.');
  const loginStreak = {
    daysRequired: Math.max(1, Math.floor(num(ls.daysRequired, 1))),
    boostCredits: Math.max(0, Math.floor(num(ls.boostCredits, 0))),
  };

  return {
    value: {
      pageTitle: str(body.pageTitle) || 'REFERRAL SYSTEM',
      pageSubtitle: str(body.pageSubtitle),
      freeSignUpTitle: str(body.freeSignUpTitle) || 'FREE SIGN-UP PROMOTIONS',
      freeSignUpSubtitle: str(body.freeSignUpSubtitle),
      freeTiers: nextFree,
      networkBuilderBadge,
      paidTitle: str(body.paidTitle) || 'PAID PROMOTION PACKAGES',
      paidSubtitle: str(body.paidSubtitle),
      paidTiers: nextPaid,
      revenueDriverBadge,
      reviewsTitle: str(body.reviewsTitle) || 'REVIEWS',
      reviewsSubtitle: str(body.reviewsSubtitle),
      reviewMilestones: nextReviews,
      trustedReviewerBadge,
      completionTitle: str(body.completionTitle) || 'Completed All Referral',
      completionSubtitle: str(body.completionSubtitle),
      platformDominatorBadge,
      loginStreakTitle: str(body.loginStreakTitle) || 'Log In streak',
      loginStreakSubtitle: str(body.loginStreakSubtitle),
      loginStreak,
    },
  };
}

router.use(authMiddleware, requirePlatformAdmin);

router.get('/', async (_req, res) => {
  try {
    await ensureReferralProgram();
    const { data, error } = await getSupabaseAdmin()
      .from('referral_programs')
      .select('*')
      .eq('id', 'default')
      .maybeSingle();
    if (error) throw error;
    if (!data) return res.status(500).json({ message: 'Programi i referimit nuk u gjet.' });
    res.json({ program: formatReferralProgram(data) });
  } catch (error) {
    console.error('GET /admin/referral-program:', error?.message || error);
    res.status(500).json({ message: 'Gabim serveri.' });
  }
});

router.put('/', async (req, res) => {
  try {
    await ensureReferralProgram();
    const parsed = parseBody(req.body);
    if (parsed.error) {
      return res.status(400).json({ message: parsed.error });
    }

    const v = parsed.value;
    const { data, error } = await getSupabaseAdmin()
      .from('referral_programs')
      .update({
        page_title: v.pageTitle,
        page_subtitle: v.pageSubtitle,
        free_sign_up_title: v.freeSignUpTitle,
        free_sign_up_subtitle: v.freeSignUpSubtitle,
        free_tiers: v.freeTiers,
        network_builder_badge: v.networkBuilderBadge,
        paid_title: v.paidTitle,
        paid_subtitle: v.paidSubtitle,
        paid_tiers: v.paidTiers,
        revenue_driver_badge: v.revenueDriverBadge,
        reviews_title: v.reviewsTitle,
        reviews_subtitle: v.reviewsSubtitle,
        review_milestones: v.reviewMilestones,
        trusted_reviewer_badge: v.trustedReviewerBadge,
        completion_title: v.completionTitle,
        completion_subtitle: v.completionSubtitle,
        platform_dominator_badge: v.platformDominatorBadge,
        login_streak_title: v.loginStreakTitle,
        login_streak_subtitle: v.loginStreakSubtitle,
        login_streak: v.loginStreak,
        updated_at: new Date().toISOString(),
      })
      .eq('id', 'default')
      .select('*')
      .single();
    if (error) throw error;
    if (!data) return res.status(500).json({ message: 'Programi i referimit nuk u gjet.' });
    res.json({ program: formatReferralProgram(data) });
  } catch (error) {
    console.error('PUT /admin/referral-program:', error?.message || error);
    res.status(500).json({ message: 'Gabim serveri.' });
  }
});

module.exports = router;
