'use strict';

const express = require('express');
const authMiddleware = require('../middleware/auth');
const { getSupabaseAdmin } = require('../lib/supabase');
const { camelizeRow } = require('../lib/profiles');
const { validateJobPayload } = require('../lib/job-field-rules');
const { notifyAdminsListingSubmitted } = require('../lib/listing-moderation');
const { sanitizeImageUrls } = require('../lib/image-upload');
const { isUuid } = require('../lib/public-listings/query-helpers');
const { resolveOptionalCityAndZone } = require('../lib/listing-city');
const { slugifyTitle } = require('../lib/real-estate-permalink');
const { formatMineJob, formatMineJobFull, loadMineKind, loadMineListingById } = require('../lib/mine-listings');
const {
  assertCanCreateCategoryListing,
  recordCategoryListingSlotUse,
} = require('../lib/listing-category-quota');
const { parseMapsFieldsFromBody, mapsColumnsFromParsed, mapsJsonFromDoc } = require('../lib/listing-maps-fields');

const router = express.Router();

const MAX_JOB_IMAGES = 1;

function requirePortalUser(req, res, next) {
  const model = req.user?.constructor?.modelName;
  if (model !== 'IndividualUser' && model !== 'BusinessUser') {
    return res
      .status(403)
      .json({ message: 'Ky veprim është i disponueshëm vetëm për llogaritë individuale ose të biznesit.' });
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
  let reservedSlot = false;
  try {
    const quota = await assertCanCreateCategoryListing(req.user.id, 'job');
    if (!quota.ok) return res.status(quota.status || 403).json({ message: quota.message });

    const body = req.body;

    const v = validateJobPayload(body);
    if (!v.ok) return res.status(400).json({ message: v.message });

    const city = await resolveOptionalCityAndZone(body.cityId, body.zoneId);
    if (!city.ok) return res.status(400).json({ message: city.message });
    const cityId = city.cityId;

    const maps = await parseMapsFieldsFromBody(body);
    if (!maps.ok) return res.status(400).json({ message: maps.message });

    const hasSalary = body.salary !== null && body.salary !== undefined && String(body.salary).trim() !== '';

    const reserved = await recordCategoryListingSlotUse(req.user.id, 'job');
    if (!reserved.ok) return res.status(reserved.status || 403).json({ message: reserved.message });
    reservedSlot = !reserved.skipped;

    const row = {
      poster_id: req.user.id,
      title: String(body.title).trim(),
      permalink_slug: slugifyTitle(body.title),
      description: String(body.description).trim(),
      industry: body.industry,
      cover_mode: body.coverMode,
      city_id: cityId,
      zone_id: city.zoneId,
      education: body.education,
      experience: body.experience,
      job_type: body.jobType,
      work_location: body.workLocation,
      preferred_gender: body.preferredGender,
      preferred_age_min: body.preferredAgeMin,
      preferred_age_max: body.preferredAgeMax,
      salary: hasSalary ? Number(body.salary) : null,
      contact_phone: String(body.contactPhone || '').trim(),
      responsibilities: v.responsibilities,
      requirements: v.requirements,
      required_roles: v.requiredRoles,
      benefits: v.benefits,
      image_urls: sanitizeImageUrls(body.imageUrls, MAX_JOB_IMAGES),
      status: 'approved',
      ...mapsColumnsFromParsed(maps),
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
        ...mapsJsonFromDoc(doc),
      },
    });
  } catch (err) {
    if (reservedSlot) {
      const { refundSubscriptionSlot } = require('../lib/listing-quota-convert');
      await refundSubscriptionSlot(req.user.id, 'job').catch(() => {});
    }
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

    const city = await resolveOptionalCityAndZone(body.cityId, body.zoneId);
    if (!city.ok) return res.status(400).json({ message: city.message });
    const cityId = city.cityId;

    const maps = await parseMapsFieldsFromBody(body);
    if (!maps.ok) return res.status(400).json({ message: maps.message });

    const hasSalary = body.salary !== null && body.salary !== undefined && String(body.salary).trim() !== '';

    const patch = {
      title: String(body.title).trim(),
      description: String(body.description).trim(),
      industry: body.industry,
      cover_mode: body.coverMode,
      city_id: cityId,
      zone_id: city.zoneId,
      education: body.education,
      experience: body.experience,
      job_type: body.jobType,
      work_location: body.workLocation,
      preferred_gender: body.preferredGender,
      preferred_age_min: body.preferredAgeMin,
      preferred_age_max: body.preferredAgeMax,
      salary: hasSalary ? Number(body.salary) : null,
      // Column is NOT NULL DEFAULT 'EUR' — never write null on update.
      currency: hasSalary ? body.currency : 'EUR',
      contact_phone: String(body.contactPhone || '').trim(),
      responsibilities: v.responsibilities,
      requirements: v.requirements,
      required_roles: v.requiredRoles,
      benefits: v.benefits,
      image_urls: sanitizeImageUrls(body.imageUrls, MAX_JOB_IMAGES),
      updated_at: new Date().toISOString(),
    };
    if (!maps.skip) Object.assign(patch, mapsColumnsFromParsed(maps));

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
      listing: {
        id: String(doc.id),
        title: doc.title,
        status: doc.status,
        updatedAt: doc.updatedAt,
        ...mapsJsonFromDoc(doc),
      },
    });
  } catch (err) {
    console.error('PUT /listings/jobs/:id:', err?.message || err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
