'use strict';

const express = require('express');
const authMiddleware = require('../middleware/auth');
const optionalAuth = require('../middleware/optional-auth');
const requirePortalUser = require('../middleware/require-portal-user');
const { getSupabaseAdmin } = require('../lib/supabase');
const { getProfileById } = require('../lib/profiles');
const { isUuid } = require('../lib/public-listings/query-helpers');

const router = express.Router();

function formatReview(doc, reviewerName, extras = {}) {
  return {
    id: String(doc.id),
    memberId: String(doc.member_id ?? extras.memberId ?? ''),
    rating: doc.rating,
    comment: doc.comment ?? '',
    reviewerName: reviewerName ?? 'Përdorues',
    createdAt: doc.created_at,
    source: extras.source ?? 'profile',
    listingId: extras.listingId ? String(extras.listingId) : null,
    listingTitle: extras.listingTitle ? String(extras.listingTitle) : null,
  };
}

/**
 * Same review pool as getReceivedReviewStats: profile reviews + directory listing reviews.
 */
async function loadReceivedReviews(sb, memberId) {
  const [{ data: listings, error: listErr }, memberRes] = await Promise.all([
    sb.from('directory_listings').select('id, title').eq('poster_id', memberId),
    sb.from('member_reviews').select('*').eq('member_id', memberId),
  ]);
  if (listErr) throw listErr;

  const memberMissing =
    memberRes.error &&
    (memberRes.error.code === '42P01' ||
      /member_reviews|does not exist|schema cache/i.test(String(memberRes.error.message || '')));
  if (memberRes.error && !memberMissing) throw memberRes.error;

  const listingRows = listings || [];
  const listingIds = listingRows.map((l) => l.id);
  const listingTitleById = new Map(
    listingRows.map((l) => [String(l.id), String(l.title || '').trim() || null]),
  );

  let businessDocs = [];
  let professionalDocs = [];
  if (listingIds.length > 0) {
    const [businessRes, professionalRes] = await Promise.all([
      sb.from('business_listing_reviews').select('*').in('listing_id', listingIds),
      sb.from('professional_listing_reviews').select('*').in('listing_id', listingIds),
    ]);
    if (businessRes.error) throw businessRes.error;
    if (professionalRes.error) throw professionalRes.error;
    businessDocs = businessRes.data || [];
    professionalDocs = professionalRes.data || [];
  }

  const profileDocs = memberMissing ? [] : memberRes.data || [];
  return { profileDocs, businessDocs, professionalDocs, listingTitleById };
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

    const { profileDocs, businessDocs, professionalDocs, listingTitleById } =
      await loadReceivedReviews(sb, memberId);

    const viewerId = req.user?.id || req.user?._id ? String(req.user.id || req.user._id) : '';
    // Leave-review on the profile only checks profile reviews (listing reviews are separate).
    const viewerHasReviewed = Boolean(
      viewerId && profileDocs.some((d) => String(d.reviewer_id) === viewerId),
    );

    const formatted = await Promise.all([
      ...profileDocs.map(async (d) =>
        formatReview(d, await reviewerDisplayName(d.reviewer_id), { source: 'profile' }),
      ),
      ...businessDocs.map(async (d) =>
        formatReview(d, await reviewerDisplayName(d.reviewer_id), {
          source: 'business',
          memberId,
          listingId: d.listing_id,
          listingTitle: listingTitleById.get(String(d.listing_id)),
        }),
      ),
      ...professionalDocs.map(async (d) =>
        formatReview(d, await reviewerDisplayName(d.reviewer_id), {
          source: 'professional',
          memberId,
          listingId: d.listing_id,
          listingTitle: listingTitleById.get(String(d.listing_id)),
        }),
      ),
    ]);

    formatted.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    const reviews = formatted.slice(0, 50);

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
    try {
      const { notifyMemberReview } = require('../lib/user-notifications');
      await notifyMemberReview({
        memberId,
        reviewerId,
        rating: v.rating,
      });
    } catch (notifyErr) {
      console.warn('notifyMemberReview:', notifyErr?.message || notifyErr);
    }
    return res.status(201).json({ review: formatReview(created, name) });
  } catch (err) {
    console.error('POST /member-reviews:', err?.message || err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
