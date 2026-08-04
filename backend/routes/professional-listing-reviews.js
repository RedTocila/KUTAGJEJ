'use strict';

const express = require('express');
const authMiddleware = require('../middleware/auth');
const optionalAuth = require('../middleware/optional-auth');
const requirePortalUser = require('../middleware/require-portal-user');
const { getSupabaseAdmin } = require('../lib/supabase');
const { getProfileById } = require('../lib/profiles');
const { isUuid } = require('../lib/public-listings/query-helpers');
const { validateProfessionalReviewPayload } = require('../lib/directory-professional-validation');

const router = express.Router();

function formatReview(doc, reviewerName) {
  return {
    id: String(doc.id),
    listingId: String(doc.listing_id),
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

function isUniqueViolation(err) {
  return err?.code === '23505' || err?.code === 23505;
}

router.get('/', optionalAuth, async (req, res) => {
  try {
    const listingId = String(req.query.listingId || '').trim();
    if (!isUuid(listingId)) {
      return res.status(400).json({ message: 'Njoftimi nuk është i vlefshëm.' });
    }

    const sb = getSupabaseAdmin();
    const { data: listing, error: listingErr } = await sb
      .from('directory_listings')
      .select('id')
      .eq('id', listingId)
      .eq('vertical', 'professionals')
      .maybeSingle();
    if (listingErr) throw listingErr;
    if (!listing) return res.status(404).json({ message: 'Njoftimi nuk u gjet.' });

    const { data: docs, error } = await sb
      .from('professional_listing_reviews')
      .select('*')
      .eq('listing_id', listingId)
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
    console.error('GET /professional-reviews:', err?.message || err);
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/', authMiddleware, requirePortalUser, async (req, res) => {
  try {
    const body = req.body;
    const v = validateProfessionalReviewPayload(body);
    if (!v.ok) return res.status(400).json({ message: v.message });

    const listingId = String(body.listingId || '').trim();
    if (!isUuid(listingId)) {
      return res.status(400).json({ message: 'Njoftimi nuk u gjet.' });
    }

    const sb = getSupabaseAdmin();
    const { data: listing, error: listingErr } = await sb
      .from('directory_listings')
      .select('id, poster_id')
      .eq('id', listingId)
      .eq('vertical', 'professionals')
      .maybeSingle();
    if (listingErr) throw listingErr;
    if (!listing) return res.status(404).json({ message: 'Njoftimi nuk u gjet.' });

    const reviewerId = req.user.id || req.user._id;
    if (String(listing.poster_id) === String(reviewerId)) {
      return res.status(400).json({ message: 'Nuk mund të vlerësoni profilin tuaj.' });
    }

    const { data: existing, error: existingErr } = await sb
      .from('professional_listing_reviews')
      .select('id')
      .eq('listing_id', listingId)
      .eq('reviewer_id', reviewerId)
      .maybeSingle();
    if (existingErr) throw existingErr;

    if (existing) {
      return res.status(400).json({ message: 'Keni lënë tashmë një vlerësim.' });
    }

    const { data: doc, error: insertErr } = await sb
      .from('professional_listing_reviews')
      .insert({
        listing_id: listingId,
        reviewer_id: reviewerId,
        rating: v.rating,
        comment: v.comment,
      })
      .select('*')
      .single();
    if (insertErr) {
      if (isUniqueViolation(insertErr)) {
        return res.status(400).json({ message: 'Keni lënë tashmë një vlerësim.' });
      }
      throw insertErr;
    }

    const name = await reviewerDisplayName(reviewerId);
    res.status(201).json({ review: formatReview(doc, name) });
  } catch (err) {
    console.error('POST /professional-reviews:', err?.message || err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
