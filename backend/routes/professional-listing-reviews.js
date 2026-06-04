const express = require('express');
const mongoose = require('mongoose');
const authMiddleware = require('../middleware/auth');
const DirectoryListing = require('../models/DirectoryListing');
const ProfessionalListingReview = require('../models/ProfessionalListingReview');
const { validateProfessionalReviewPayload } = require('../lib/directory-professional-validation');

const router = express.Router();

function requirePortalUser(req, res, next) {
  const model = req.user?.constructor?.modelName;
  if (model !== 'IndividualUser' && model !== 'BusinessUser') {
    return res.status(403).json({ message: 'Duhet të jeni të kyçur për të lënë vlerësim.' });
  }
  next();
}

function formatReview(doc, reviewerName) {
  return {
    id: String(doc._id),
    listingId: String(doc.listingId),
    rating: doc.rating,
    comment: doc.comment ?? '',
    reviewerName: reviewerName ?? 'Përdorues',
    createdAt: doc.createdAt,
  };
}

async function reviewerDisplayName(reviewerModel, reviewerId) {
  const UserModel = mongoose.model(reviewerModel);
  const u = await UserModel.findById(reviewerId).lean();
  if (!u) return 'Përdorues';
  if (reviewerModel === 'BusinessUser') return u.businessName || u.email || 'Biznes';
  const parts = [u.firstName, u.lastName].filter(Boolean).join(' ').trim();
  return parts || u.email || 'Përdorues';
}

router.get('/', async (req, res) => {
  try {
    const listingId = String(req.query.listingId || '').trim();
    if (!mongoose.isValidObjectId(listingId)) {
      return res.status(400).json({ message: 'Njoftimi nuk është i vlefshëm.' });
    }

    const listing = await DirectoryListing.findOne({
      _id: listingId,
      vertical: 'professionals',
    }).lean();
    if (!listing) return res.status(404).json({ message: 'Njoftimi nuk u gjet.' });

    const docs = await ProfessionalListingReview.find({ listingId })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    const reviews = await Promise.all(
      docs.map(async (d) => formatReview(d, await reviewerDisplayName(d.reviewerModel, d.reviewerId))),
    );

    res.json({ reviews });
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
    if (!mongoose.isValidObjectId(listingId)) {
      return res.status(400).json({ message: 'Njoftimi nuk u gjet.' });
    }

    const listing = await DirectoryListing.findOne({
      _id: listingId,
      vertical: 'professionals',
    }).lean();
    if (!listing) return res.status(404).json({ message: 'Njoftimi nuk u gjet.' });

    const reviewerModel = req.user.constructor.modelName;
    const reviewerId = req.user._id;

    if (String(listing.posterId) === String(reviewerId) && listing.posterModel === reviewerModel) {
      return res.status(400).json({ message: 'Nuk mund të vlerësoni profilin tuaj.' });
    }

    const existing = await ProfessionalListingReview.findOne({ listingId, reviewerId, reviewerModel });
    if (existing) {
      existing.rating = v.rating;
      existing.comment = v.comment;
      await existing.save();
      const name = await reviewerDisplayName(reviewerModel, reviewerId);
      return res.json({ review: formatReview(existing, name), updated: true });
    }

    const doc = await ProfessionalListingReview.create({
      listingId,
      reviewerId,
      reviewerModel,
      rating: v.rating,
      comment: v.comment,
    });

    const name = await reviewerDisplayName(reviewerModel, reviewerId);
    res.status(201).json({ review: formatReview(doc, name), updated: false });
  } catch (err) {
    if (err?.code === 11000) {
      return res.status(400).json({ message: 'Keni lënë tashmë një vlerësim.' });
    }
    console.error('POST /professional-reviews:', err?.message || err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
