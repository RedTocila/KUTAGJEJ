'use strict';

const express = require('express');
const authMiddleware = require('../middleware/auth');
const { getSupabaseAdmin } = require('../lib/supabase');
const { camelizeRow, camelizeRows } = require('../lib/profiles');
const { validateJobPayload } = require('../lib/job-field-rules');
const { attachOwnerMetrics } = require('../lib/listing-metrics');
const { notifyAdminsListingSubmitted } = require('../lib/listing-moderation');
const { sanitizeImageUrls } = require('../lib/image-upload');
const { isUuid, buildCityIndex } = require('../lib/public-listings/query-helpers');

const router = express.Router();

const MAX_JOB_IMAGES = 5;

function requirePortalUser(req, res, next) {
  const model = req.user?.constructor?.modelName;
  if (model !== 'IndividualUser' && model !== 'BusinessUser') {
    return res.status(403).json({ message: 'Ky veprim është i disponueshëm vetëm për llogaritë individuale ose të biznesit.' });
  }
  next();
}

function formatMineListing(doc, cityById) {
  const city = cityById?.get(String(doc.cityId));
  return {
    id: String(doc.id),
    title: doc.title,
    description: doc.description,
    industry: doc.industry,
    cityId: doc.cityId ? String(doc.cityId) : null,
    cityName: city?.name ?? null,
    education: doc.education,
    experience: doc.experience,
    jobType: doc.jobType,
    workLocation: doc.workLocation,
    salary: doc.salary ?? null,
    currency: doc.currency ?? null,
    contactPhone: doc.contactPhone ?? null,
    responsibilities: doc.responsibilities ?? [],
    requirements: doc.requirements ?? [],
    benefits: doc.benefits ?? [],
    imageUrls: doc.imageUrls ?? [],
    status: doc.status || 'pending',
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

/** GET /api/listings/jobs/mine */
router.get('/mine', authMiddleware, requirePortalUser, async (req, res) => {
  try {
    const { data, error } = await getSupabaseAdmin()
      .from('job_listings')
      .select('*')
      .eq('poster_id', req.user.id)
      .order('created_at', { ascending: false });
    if (error) throw error;

    const docs = camelizeRows(data);
    const cityById = await buildCityIndex(docs);
    const listings = docs.map((d) => formatMineListing(d, cityById));
    res.json({ listings: await attachOwnerMetrics(listings, 'job') });
  } catch (err) {
    console.error('GET /listings/jobs/mine:', err?.message || err);
    res.status(500).json({ message: 'Server error' });
  }
});

/** POST /api/listings/jobs */
router.post('/', authMiddleware, requirePortalUser, async (req, res) => {
  try {
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
      message: 'Njoftimi u dërgua për aprovim..',
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

module.exports = router;
