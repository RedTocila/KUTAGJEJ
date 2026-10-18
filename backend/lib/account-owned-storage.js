'use strict';

/**
 * Collect and delete files a portal user uploaded, before Auth deletion cascades
 * the database rows that point at them.
 *
 * Only objects in our own stores are removed:
 * - Supabase Storage bucket `uploads`
 * - Vercel Blob URLs on *.blob.vercel-storage.com
 *
 * External URLs (imported pages, CDNs) are left alone.
 */

const UPLOADS_BUCKET = 'uploads';
const REMOVE_CHUNK = 100;

const LISTING_TABLES = [
  'real_estate_listings',
  'car_listings',
  'job_listings',
  'marketplace_listings',
];

function addUrl(urls, value) {
  if (value == null) return;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (/^https?:\/\//i.test(trimmed)) urls.add(trimmed);
    return;
  }
  if (Array.isArray(value)) {
    for (const item of value) addUrl(urls, item);
    return;
  }
  if (typeof value === 'object') {
    for (const item of Object.values(value)) addUrl(urls, item);
  }
}

function classifyStorageUrl(rawUrl) {
  let parsed;
  try {
    parsed = new URL(String(rawUrl || '').trim());
  } catch {
    return null;
  }
  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return null;

  const path = decodeURIComponent(parsed.pathname);
  const supabase = path.match(/\/storage\/v1\/object\/(?:public|sign|authenticated)\/uploads\/(.+)$/i);
  if (supabase && supabase[1]) {
    return { provider: 'supabase', bucket: UPLOADS_BUCKET, path: supabase[1] };
  }

  if (/(^|\.)blob\.vercel-storage\.com$/i.test(parsed.hostname)) {
    parsed.hash = '';
    parsed.search = '';
    return { provider: 'vercel-blob', url: parsed.toString() };
  }

  return null;
}

async function selectOwnedRows(sb, table, columns, userColumn, userId) {
  const { data, error } = await sb.from(table).select(columns).eq(userColumn, userId);
  if (error) {
    const err = new Error(`Could not read ${table} before account deletion`);
    err.cause = error;
    throw err;
  }
  return data || [];
}

async function collectOwnedStorageTargets(sb, userId) {
  const urls = new Set();

  const profiles = await selectOwnedRows(sb, 'profiles', 'avatar_url', 'id', userId);
  for (const row of profiles) addUrl(urls, row.avatar_url);

  for (const table of LISTING_TABLES) {
    const rows = await selectOwnedRows(sb, table, 'image_urls', 'poster_id', userId);
    for (const row of rows) addUrl(urls, row.image_urls);
  }

  const directories = await selectOwnedRows(
    sb,
    'directory_listings',
    'image_urls, announcement_banner_url, menu_items, portfolio_items',
    'poster_id',
    userId,
  );
  for (const row of directories) {
    addUrl(urls, row.image_urls);
    addUrl(urls, row.announcement_banner_url);
    addUrl(urls, row.menu_items);
    addUrl(urls, row.portfolio_items);
  }

  const messages = await selectOwnedRows(sb, 'messages', 'image_url', 'sender_id', userId);
  for (const row of messages) addUrl(urls, row.image_url);

  const ownedThreads = await selectOwnedRows(
    sb,
    'conversations',
    'listing_image_url',
    'poster_id',
    userId,
  );
  for (const row of ownedThreads) addUrl(urls, row.listing_image_url);

  for (const table of ['professional_verification_requests', 'job_employer_verification_requests']) {
    const rows = await selectOwnedRows(
      sb,
      table,
      'id_front_image_url, applicant_snapshot',
      'applicant_id',
      userId,
    );
    for (const row of rows) {
      addUrl(urls, row.id_front_image_url);
      addUrl(urls, row.applicant_snapshot);
    }
  }

  const targets = [];
  const seen = new Set();
  for (const url of urls) {
    const target = classifyStorageUrl(url);
    if (!target) continue;
    const key = target.provider === 'supabase' ? `s:${target.path}` : `b:${target.url}`;
    if (seen.has(key)) continue;
    seen.add(key);
    targets.push(target);
  }
  return targets;
}

async function defaultDeleteBlobs(urls) {
  if (!urls.length) return;
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    throw new Error('Vercel Blob cleanup is not configured');
  }
  const { del } = require('@vercel/blob');
  await del(urls, { token: process.env.BLOB_READ_WRITE_TOKEN });
}

async function deleteOwnedStorageTargets(targets, deps) {
  const paths = targets.filter((target) => target.provider === 'supabase').map((target) => target.path);
  const blobs = targets.filter((target) => target.provider === 'vercel-blob').map((target) => target.url);
  const failures = [];
  const storage = deps.storage;
  const deleteBlobs = deps.deleteBlobs || defaultDeleteBlobs;

  for (let index = 0; index < paths.length; index += REMOVE_CHUNK) {
    const chunk = paths.slice(index, index + REMOVE_CHUNK);
    const { error } = await storage.from(UPLOADS_BUCKET).remove(chunk);
    if (error) failures.push(error.message || 'Supabase storage delete failed');
  }

  if (blobs.length) {
    try {
      await deleteBlobs(blobs);
    } catch (err) {
      failures.push(err?.message || 'Vercel Blob delete failed');
    }
  }

  return { ok: failures.length === 0, failures, removed: { supabase: paths.length, blobs: blobs.length } };
}

async function deleteUserOwnedFiles(sb, userId, deps = {}) {
  const targets = await collectOwnedStorageTargets(sb, userId);
  return deleteOwnedStorageTargets(targets, {
    storage: deps.storage || sb.storage,
    deleteBlobs: deps.deleteBlobs,
  });
}

module.exports = {
  UPLOADS_BUCKET,
  classifyStorageUrl,
  collectOwnedStorageTargets,
  deleteOwnedStorageTargets,
  deleteUserOwnedFiles,
};
