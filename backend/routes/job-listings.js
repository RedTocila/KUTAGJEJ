'use strict';

const express = require('express');
const authMiddleware = require('../middleware/auth');
const { getSupabaseAdmin } = require('../lib/supabase');
const { camelizeRow } = require('../lib/profiles');
const { validateJobPayload } = require('../lib/job-field-rules');
const { notifyAdminsListingSubmitted } = require('../lib/listing-moderation');
const { sanitizeImageUrls } = require('../lib/image-upload');
const { isUuid } = require('../lib/public-listings/query-helpers');
const { formatMineJob, formatMineJobFull, loadMineKind, loadMineListingById } = require('../lib/mine-listings');
const { assertCanCreateCategoryListing } = require('../lib/listing-category-quota');

const router = express.Router();

const MAX_JOB_IMAGES = 5;

function requirePortalUser(req, res, next) {
  const model = req.user?.constructor?.modelName;
  if (model !== 'IndividualUser' && model !== 'BusinessUser') {
    return res.status(403).json({ message: 'Ky veprim është i disponueshëm vetëm për llogaritë individuale ose të biznesit.' });
  }
  next();
}

/** GET /api/listings/jobs/mine */
router.get('/mine', authMiddleware, requirePortalUser, async (req, res) => {
  try {
    const listings = await loadMineKind(req.user.id, {
      table: 'job_listings',
      metricKind: 'job',
      format: formatMineJob,
    });
    res.json({ listings });
  } catch (err) {
    console.error('GET /listings/jobs/mine:', err?.message || err);
    res.status(500).json({ message: 'Server error' });
  }
});

/** GET /api/listings/jobs/mine/:id */
router.get('/mine/:id', authMiddleware, requirePortalUser, async (req, res) => {
  try {
    if (!isUuid(req.params.id)) return res.status(400).json({ message: 'ID e pavlefshme.' });
    const listing = await loadMineListingById(req.user.id, {
      table: 'job_listings',
      listingId: req.params.id,
      metricKind: 'job',
      format: formatMineJobFull,
    });
    if (!listing) return res.status(404).json({ message: 'Njoftimi nuk u gjet.' });
    res.json({ listing });
  } catch (err) {
    console.error('GET /listings/jobs/mine/:id:', err?.message || err);
    res.status(500).json({ message: 'Server error' });
  }
});

/** POST /api/listings/jobs */
router.post('/', authMiddleware, requirePortalUser, async (req, res) => {
  try {
    const quota = await assertCanCreateCategoryListing(req.user.id, 'job');
    if (!quota.ok) return res.status(quota.status || 403).json({ message: quota.message });

    const body = req.body;

    const v = validateJobPayload(body);
    if (!v.ok) return res.status(400).json({ message: v.message });

    const cityId = String(body.cityId).trim();
    if (!isUuid(cityId)) return res.status(400).json({ message: 'Qyteti nuk u gjet.' });

    const { data: city, error: cityErr } = await getSupabaseAdmin()
      .from('real_estate_cities')
      .select('id')
      .eq('id', cityId)
      .maybeSingle();
    if (cityErr) throw cityErr;
    if (!city) return res.status(400).json({ message: 'Qyteti nuk u gjet.' });

    const hasSalary = body.salary !== null && body.salary !== undefined && String(body.salary).trim() !== '';

    const row = {
      poster_id: req.user.id,
      title: String(body.title).trim(),
      description: String(body.description).trim(),
      industry: body.industry,
      city_id: cityId,
      education: body.education,
      experience: body.experience,
      job_type: body.jobType,
      work_location: body.workLocation,
      salary: hasSalary ? Number(body.salary) : null,
      contact_phone: String(body.contactPhone || '').trim(),
      responsibilities: v.responsibilities,
      requirements: v.requirements,
      benefits: v.benefits,
      image_urls: sanitizeImageUrls(body.imageUrls, MAX_JOB_IMAGES),
      status: 'approved',
    };
    if (hasSalary) row.currency = body.currency;

    const { data: created, error: insErr } = await getSupabaseAdmin()
      .from('job_listings')
      .insert(row)
      .select('*')
      .single();
    if (insErr) throw insErr;

    const doc = camelizeRow(created);
    await notifyAdminsListingSubmitted('jobs', doc.id, doc.title);

    res.status(201).json({
      message: 'Njoftimi u publikua me sukses.',
      listing: {
        id: String(doc.id),
        title: doc.title,
        industry: doc.industry,
        status: doc.status,
        createdAt: doc.createdAt,
      },
    });
  } catch (err) {
    console.error('POST /listings/jobs:', err?.message || err);
    res.status(500).json({ message: 'Server error' });
  }
});

/** PUT /api/listings/jobs/:id — owner update. */
router.put('/:id', authMiddleware, requirePortalUser, async (req, res) => {
  try {
    const rawId = String(req.params.id ?? '').trim();
    if (!isUuid(rawId)) return res.status(404).json({ message: 'Njoftimi nuk u gjet.' });

    const { data: existing, error: selErr } = await getSupabaseAdmin()
      .from('job_listings')
      .select('id, poster_id')
      .eq('id', rawId)
      .eq('poster_id', req.user.id)
      .maybeSingle();
    if (selErr) throw selErr;
    if (!existing) return res.status(404).json({ message: 'Njoftimi nuk u gjet.' });

    const body = req.body;
    const v = validateJobPayload(body);
    if (!v.ok) return res.status(400).json({ message: v.message });

    const cityId = String(body.cityId).trim();
    if (!isUuid(cityId)) return res.status(400).json({ message: 'Qyteti nuk u gjet.' });

    const { data: city, error: cityErr } = await getSupabaseAdmin()
      .from('real_estate_cities')
      .select('id')
      .eq('id', cityId)
      .maybeSingle();
    if (cityErr) throw cityErr;
    if (!city) return res.status(400).json({ message: 'Qyteti nuk u gjet.' });

    const hasSalary = body.salary !== null && body.salary !== undefined && String(body.salary).trim() !== '';

    const patch = {
      title: String(body.title).trim(),
      description: String(body.description).trim(),
      industry: body.industry,
      city_id: cityId,
      education: body.education,
      experience: body.experience,
      job_type: body.jobType,
      work_location: body.workLocation,
      salary: hasSalary ? Number(body.salary) : null,
      currency: hasSalary ? body.currency : null,
      contact_phone: String(body.contactPhone || '').trim(),
      responsibilities: v.responsibilities,
      requirements: v.requirements,
      benefits: v.benefits,
      image_urls: sanitizeImageUrls(body.imageUrls, MAX_JOB_IMAGES),
      updated_at: new Date().toISOString(),
    };

    const { data: updated, error: updErr } = await getSupabaseAdmin()
      .from('job_listings')
      .update(patch)
      .eq('id', rawId)
      .select('*')
      .single();
    if (updErr) throw updErr;

    const doc = camelizeRow(updated);
    res.json({
      message: 'Njoftimi u përditësua.',
      listing: { id: String(doc.id), title: doc.title, status: doc.status, updatedAt: doc.updatedAt },
    });
  } catch (err) {
    console.error('PUT /listings/jobs/:id:', err?.message || err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
