'use strict';

const crypto = require('crypto');
const { getSupabaseAdmin } = require('./supabase');
const { MAX_IMAGE_BYTES, MAX_IMAGES } = require('./image-upload');

const UPLOADS_BUCKET = 'uploads';
const FETCH_TIMEOUT_MS = 25_000;

let bucketReady = false;

function isOurStorageUrl(url) {
  const u = String(url || '');
  return (
    /\/storage\/v1\/object\/public\/uploads\//i.test(u) ||
    /\.public\.blob\.vercel-storage\.com\//i.test(u)
  );
}

async function ensureUploadsBucket() {
  if (bucketReady) return;
  const sb = getSupabaseAdmin();
  const { data, error } = await sb.storage.getBucket(UPLOADS_BUCKET);
  if (error || !data) {
    const { error: createErr } = await sb.storage.createBucket(UPLOADS_BUCKET, {
      public: true,
      fileSizeLimit: MAX_IMAGE_BYTES,
      allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
    });
    if (createErr && !/already exists/i.test(createErr.message || '')) {
      throw createErr;
    }
  }
  bucketReady = true;
}

/**
 * Upload multer-style file objects ({ buffer, originalname, mimetype }) to
 * the public `uploads` Supabase bucket. Returns public URLs in order.
 */
async function uploadBuffersToSupabase(files, folder = 'listings') {
  await ensureUploadsBucket();
  const sb = getSupabaseAdmin();
  const urls = [];
  for (const file of files || []) {
    const ext = String(file.originalname || 'image').split('.').pop() || 'jpg';
    const safeExt = /^[a-z0-9]{1,8}$/i.test(ext) ? ext.toLowerCase() : 'jpg';
    const path = `${folder}/${Date.now()}-${crypto.randomBytes(6).toString('hex')}.${safeExt}`;
    const { error } = await sb.storage.from(UPLOADS_BUCKET).upload(path, file.buffer, {
      contentType: file.mimetype || 'image/jpeg',
      upsert: false,
    });
    if (error) throw error;
    const { data: publicUrlData } = sb.storage.from(UPLOADS_BUCKET).getPublicUrl(path);
    urls.push(publicUrlData.publicUrl);
  }
  return urls;
}

function extFromContentType(contentType) {
  const ct = String(contentType || '')
    .split(';')[0]
    .trim()
    .toLowerCase();
  if (ct === 'image/jpeg' || ct === 'image/jpg') return 'jpg';
  if (ct === 'image/png') return 'png';
  if (ct === 'image/webp') return 'webp';
  if (ct === 'image/gif') return 'gif';
  return null;
}

function extFromUrl(url) {
  try {
    const pathname = new URL(url).pathname;
    const ext = pathname.split('.').pop() || '';
    if (/^(jpe?g|png|webp|gif)$/i.test(ext)) {
      return ext.toLowerCase() === 'jpeg' ? 'jpg' : ext.toLowerCase();
    }
  } catch {
    /* ignore */
  }
  return 'jpg';
}

/**
 * Fetch a remote image and store it in our uploads bucket.
 * Returns the public URL, or null if the fetch/upload fails.
 */
async function mirrorRemoteImageUrl(url, folder = 'listings') {
  const raw = String(url || '').trim();
  if (!/^https?:\/\//i.test(raw)) return null;
  if (isOurStorageUrl(raw)) return raw;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(raw, {
      signal: controller.signal,
      redirect: 'follow',
      headers: {
        Accept: 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8',
        'User-Agent':
          'Mozilla/5.0 (compatible; KuTaGjejBot/1.0; +https://kutagjej.vercel.app)',
      },
    });
    if (!res.ok) return null;

    const contentType = res.headers.get('content-type') || '';
    const ext = extFromContentType(contentType) || extFromUrl(raw);
    if (!ext) return null;

    const buf = Buffer.from(await res.arrayBuffer());
    if (!buf.length || buf.length > MAX_IMAGE_BYTES) return null;

    const mime =
      extFromContentType(contentType) != null
        ? contentType.split(';')[0].trim().toLowerCase()
        : `image/${ext === 'jpg' ? 'jpeg' : ext}`;

    const [publicUrl] = await uploadBuffersToSupabase(
      [{ buffer: buf, originalname: `remote.${ext}`, mimetype: mime }],
      folder,
    );
    return publicUrl || null;
  } catch (err) {
    console.warn('mirrorRemoteImageUrl failed:', raw.slice(0, 120), err?.message || err);
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Mirror a list of remote image URLs into our storage.
 * Already-hosted KuTaGjej URLs are kept as-is. Failed mirrors are skipped.
 */
async function mirrorRemoteImageUrls(urls, folder = 'listings', max = MAX_IMAGES) {
  const input = Array.isArray(urls) ? urls : [];
  const out = [];
  const seen = new Set();
  for (const raw of input) {
    if (out.length >= max) break;
    const url = String(raw || '').trim();
    if (!url || seen.has(url)) continue;
    seen.add(url);
    const mirrored = await mirrorRemoteImageUrl(url, folder);
    if (mirrored && !out.includes(mirrored)) out.push(mirrored);
  }
  return out;
}

module.exports = {
  UPLOADS_BUCKET,
  isOurStorageUrl,
  ensureUploadsBucket,
  uploadBuffersToSupabase,
  mirrorRemoteImageUrl,
  mirrorRemoteImageUrls,
};
