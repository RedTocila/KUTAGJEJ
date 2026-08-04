'use strict';

const express = require('express');
const authMiddleware = require('../middleware/auth');
const optionalAuth = require('../middleware/optional-auth');
const requirePortalUser = require('../middleware/require-portal-user');
const { getSupabaseAdmin } = require('../lib/supabase');
const { getProfileById } = require('../lib/profiles');
const { isUuid } = require('../lib/public-listings/query-helpers');

const router = express.Router();

function formatReview(doc, reviewerName) {
  return {
    id: String(doc.id),
    memberId: String(doc.member_id),
    rating: doc.rating,
    comment: doc.comment ?? '',
    reviewerName: reviewerName ?? 'Përdorues',
    createdAt: doc.created_at,
  };
}

async function reviewerDisplayName(reviewerId) {
  const u = await getProfileById(reviewerId);
  if (!u) return 'Përdorues';
  if (u.accountType === 'business' || u.constructor?.modelName === 'BusinessUser') {
    return u.businessName || u.email || 'Biznes';
  }
  const parts = [u.firstName, u.lastName].filter(Boolean).join(' ').trim();
  return parts || u.email || 'Përdorues';
}

function validatePayload(body) {
  const rating = Number(body?.rating);
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return { ok: false, message: 'Vlerësimi duhet të jetë nga 1 deri në 5.' };
  }
  const comment = String(body?.comment ?? '')
    .trim()
    .slice(0, 2000);
  return { ok: true, rating, comment };
}

router.get('/', optionalAuth, async (req, res) => {
  try {
    const memberId = String(req.query.memberId || '').trim();
    if (!isUuid(memberId)) {
      return res.status(400).json({ message: 'Profili nuk është i vlefshëm.' });
    }

    const sb = getSupabaseAdmin();
    const member = await getProfileById(memberId);
    if (!member || (member.accountType !== 'individual' && member.accountType !== 'business')) {
      return res.status(404).json({ message: 'Profili nuk u gjet.' });
    }

    const { data: docs, error } = await sb
      .from('member_reviews')
      .select('*')
      .eq('member_id', memberId)
      .order('created_at', { ascending: false })
      .limit(50);
    if (error) throw error;

    const viewerId = req.user?.id || req.user?._id ? String(req.user.id || req.user._id) : '';
    const viewerHasReviewed = Boolean(
      viewerId && (docs || []).some((d) => String(d.reviewer_id) === viewerId),
    );

    const reviews = await Promise.all(
      (docs || []).map(async (d) => formatReview(d, await reviewerDisplayName(d.reviewer_id))),
    );

    res.json({ reviews, viewerHasReviewed });
  } catch (err) {
    console.error('GET /member-reviews:', err?.message || err);
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/', authMiddleware, requirePortalUser, async (req, res) => {
  try {
    const body = req.body;
    const v = validatePayload(body);
    if (!v.ok) return res.status(400).json({ message: v.message });

    const memberId = String(body.memberId || '').trim();
    if (!isUuid(memberId)) {
      return res.status(400).json({ message: 'Profili nuk u gjet.' });
    }

    const member = await getProfileById(memberId);
    if (!member || (member.accountType !== 'individual' && member.accountType !== 'business')) {
      return res.status(404).json({ message: 'Profili nuk u gjet.' });
    }

    const reviewerId = req.user.id || req.user._id;
    if (String(memberId) === String(reviewerId)) {
      return res.status(400).json({ message: 'Nuk mund të vlerësoni profilin tuaj.' });
    }

    const sb = getSupabaseAdmin();
    const { data: existing, error: existingErr } = await sb
      .from('member_reviews')
      .select('*')
      .eq('member_id', memberId)
      .eq('reviewer_id', reviewerId)
      .maybeSingle();
    if (existingErr) throw existingErr;

    if (existing) {
      return res.status(400).json({ message: 'Keni lënë tashmë një vlerësim për këtë profil.' });
    }

    const { data: created, error: insertErr } = await sb
      .from('member_reviews')
      .insert({
        member_id: memberId,
        reviewer_id: reviewerId,
        rating: v.rating,
        comment: v.comment,
      })
      .select('*')
      .single();
    if (insertErr) {
      if (insertErr?.code === '23505' || insertErr?.code === 23505) {
        return res.status(400).json({ message: 'Keni lënë tashmë një vlerësim për këtë profil.' });
      }
      throw insertErr;
    }

    const name = await reviewerDisplayName(reviewerId);
    return res.status(201).json({ review: formatReview(created, name) });
  } catch (err) {
    console.error('POST /member-reviews:', err?.message || err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
