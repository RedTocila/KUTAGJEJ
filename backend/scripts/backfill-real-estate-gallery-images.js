/**
 * Add multiple gallery photos (Unsplash CDN) to every real-estate listing that only has ≤1 URL.
 * Preserves existing user URLs, then merges in rotated curated photos until up to schema max (8).
 *
 * Usage:  node scripts/backfill-real-estate-gallery-images.js
 */

require('dotenv').config();

const mongoose = require('mongoose');

const { getMongoUri } = require('../lib/get-mongo-uri');
const RealEstateListing = require('../models/RealEstateListing');

const UNSPLASH_BASE = 'https://images.unsplash.com';
function unsplash(photoId) {
  return `${UNSPLASH_BASE}/${photoId}?w=900&q=80&auto=format&fit=crop`;
}

const REAL_ESTATE_IMAGES = [
  unsplash('photo-1522708323590-d24dbb6b0267'),
  unsplash('photo-1613977257363-707ba9348227'),
  unsplash('photo-1493809842364-78817add7ffb'),
  unsplash('photo-1502672260266-1c1ef2d93688'),
  unsplash('photo-1604719312566-8912e9227c6a'),
  unsplash('photo-1500382017468-9049fed747ef'),
];

/** Same rotation rule as scripts/seed-listings.js — must stay in sync visually. */
function pickGalleryUrls(gallery, slotIndex, desiredCount = 6) {
  if (!gallery.length) return [];
  const n = Math.min(Math.max(desiredCount, 1), gallery.length, 8);
  const urls = [];
  for (let k = 0; k < n; k += 1) {
    urls.push(gallery[(slotIndex + k) % gallery.length]);
  }
  return urls;
}

function uniqPreserveOrder(strings) {
  const seen = new Set();
  const out = [];
  for (const s of strings) {
    const t = typeof s === 'string' ? s.trim() : '';
    if (!t || seen.has(t)) continue;
    seen.add(t);
    out.push(t);
  }
  return out;
}

async function run() {
  const uri = getMongoUri();
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 15_000 });
  console.log('Connected');

  const docs = await RealEstateListing.find({}).sort({ createdAt: -1 }).select('_id imageUrls').lean();

  let updated = 0;
  for (let i = 0; i < docs.length; i += 1) {
    const doc = docs[i];
    const existing = Array.isArray(doc.imageUrls) ? doc.imageUrls.filter(Boolean).map(String) : [];
    const existingU = uniqPreserveOrder(existing);
    const synthesized = pickGalleryUrls(REAL_ESTATE_IMAGES, i, 6);
    const merged = uniqPreserveOrder([...existingU, ...synthesized]).slice(0, 8);

    if (JSON.stringify(merged) === JSON.stringify(existingU)) continue;

    await RealEstateListing.updateOne({ _id: doc._id }, { $set: { imageUrls: merged } });
    updated += 1;
  }

  console.log(`✓ Checked ${docs.length} real-estate rows; merged gallery images on ${updated}.`);
}

run()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
