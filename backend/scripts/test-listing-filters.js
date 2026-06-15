/**
 * Smoke-test public listing filters against the local API.
 * Run after: npm run seed-listings
 *
 * Usage: node scripts/test-listing-filters.js
 */

require('dotenv').config();

const mongoose = require('mongoose');
const { getMongoUri } = require('../lib/get-mongo-uri');
const RealEstateCity = require('../models/RealEstateCity');

const API_BASE = process.env.FILTER_TEST_API_BASE || 'http://localhost:5000/api';

async function fetchJson(path) {
  const res = await fetch(`${API_BASE}${path}`);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(`${path} → HTTP ${res.status}: ${data.message || 'request failed'}`);
  }
  return data;
}

function assertCount(label, actual, expectedMin, expectedMax = null) {
  const ok =
    actual >= expectedMin && (expectedMax == null || actual <= expectedMax);
  const range =
    expectedMax == null ? `≥ ${expectedMin}` : `${expectedMin}–${expectedMax}`;
  console.log(`${ok ? '✓' : '✗'} ${label}: ${actual} (expected ${range})`);
  if (!ok) process.exitCode = 1;
}

async function run() {
  const uri = getMongoUri();
  if (!uri) throw new Error('Missing MongoDB config in backend/.env');

  await mongoose.connect(uri, { serverSelectionTimeoutMS: 15_000 });
  const tirane = await RealEstateCity.findOne({ slug: 'tirane' }).lean();
  if (!tirane) throw new Error('Tiranë not found — run seed-listings first');

  const zoneBySlug = Object.fromEntries((tirane.zones || []).map((z) => [z.slug, String(z._id)]));
  const cityId = String(tirane._id);

  const tests = [
    {
      label: 'Real estate — page 2',
      path: '/public/listings/real-estate?limit=24&page=2',
      min: 1,
    },
    {
      label: 'Real estate — all (demo)',
      path: '/public/listings/real-estate?limit=50',
      min: 25,
    },
    {
      label: 'Real estate — Tiranë only',
      path: `/public/listings/real-estate?city=${cityId}&limit=50`,
      min: 8,
    },
    {
      label: 'Real estate — Bllok zone',
      path: `/public/listings/real-estate?city=${cityId}&zone=${zoneBySlug.bllok}&limit=50`,
      min: 2,
    },
    {
      label: 'Real estate — multi-zone (Bllok + Myslym Shyri)',
      path: `/public/listings/real-estate?city=${cityId}&zone=${zoneBySlug.bllok}&zone=${zoneBySlug['myslym-shyri']}&limit=50`,
      min: 3,
    },
    {
      label: 'Real estate — rent only',
      path: `/public/listings/real-estate?tx=rent&limit=50`,
      min: 4,
    },
    {
      label: 'Real estate — apartment + minPrice 300',
      path: `/public/listings/real-estate?cat=apartment&minPrice=300&limit=50`,
      min: 3,
    },
    {
      label: 'Cars — diesel automatic',
      path: '/public/listings/cars?fuel=diesel&transmission=automatic&limit=50',
      min: 3,
    },
    {
      label: 'Cars — BMW make',
      path: '/public/listings/cars?make=BMW&limit=50',
      min: 1,
      max: 1,
    },
    {
      label: 'Jobs — remote',
      path: '/public/listings/jobs?workLocation=remote&limit=50',
      min: 2,
    },
    {
      label: 'Marketplace — elektronike',
      path: '/public/listings/marketplace?cat=elektronike&limit=50',
      min: 1,
    },
    {
      label: 'Businesses — restorant in Tiranë',
      path: `/public/listings/businesses?type=restorant&city=${cityId}&limit=50`,
      min: 3,
    },
    {
      label: 'Professionals — konsulent',
      path: '/public/listings/professionals?type=konsulent&limit=50',
      min: 3,
    },
  ];

  console.log(`Testing filters at ${API_BASE}\n`);

  for (const test of tests) {
    const data = await fetchJson(test.path);
    const count = Array.isArray(data.listings) ? data.listings.length : 0;
    assertCount(test.label, count, test.min, test.max ?? null);
  }

  await mongoose.disconnect();
  console.log('\nFilter smoke tests finished.');
}

run().catch((err) => {
  console.error('Filter tests failed:', err?.message || err);
  process.exit(1);
});
