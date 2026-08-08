'use strict';

const crypto = require('crypto');
const { getSupabaseAdmin } = require('./supabase');
const { MAX_IMAGE_BYTES, MAX_IMAGES } = require('./image-upload');

const UPLOADS_BUCKET = 'uploads';
const FETCH_TIMEOUT_MS = 25_000;
const BROWSER_UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';

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

function imageFetchHeaders(url) {
  let host = '';
  try {
    host = new URL(url).hostname.replace(/^www\./, '').toLowerCase();
  } catch {
    host = '';
  }
  const isInstagramCdn =
    host.includes('cdninstagram.com') ||
    host.includes('fbcdn.net') ||
    host.includes('instagram.com');
  return {
    Accept: 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8',
    // Instagram CDN often blocks generic bots; use a browser UA + referer.
    'User-Agent': BROWSER_UA,
    ...(isInstagramCdn
      ? {
          Referer: 'https://www.instagram.com/',
          Origin: 'https://www.instagram.com',
        }
      : {}),
  };
}

/**
 * Download a remote listing photo. Used by storage mirroring and the public
 * story-image proxy (browser CORS / hotlink protection otherwise blanks Stories).
 */
async function fetchRemoteImageBuffer(
  url,
  { timeoutMs = FETCH_TIMEOUT_MS, maxBytes = MAX_IMAGE_BYTES } = {},
) {
  const raw = String(url || '').trim();
  if (!/^https?:\/\//i.test(raw)) return null;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(raw, {
      signal: controller.signal,
      redirect: 'follow',
      headers: imageFetchHeaders(raw),
    });
    if (!res.ok) return null;

    const contentType = (res.headers.get('content-type') || '').split(';')[0].trim().toLowerCase();
    if (contentType && !contentType.startsWith('image/') && contentType !== 'application/octet-stream') {
      return null;
    }

    const buf = Buffer.from(await res.arrayBuffer());
    if (!buf.length || buf.length > maxBytes) return null;

    const ext = extFromContentType(contentType) || extFromUrl(raw);
    const mime =
      contentType && contentType.startsWith('image/')
        ? contentType
        : `image/${ext === 'jpg' ? 'jpeg' : ext || 'jpeg'}`;

    return { buffer: buf, mime, ext: ext || 'jpg' };
  } catch (err) {
    console.warn('fetchRemoteImageBuffer failed:', raw.slice(0, 120), err?.message || err);
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Fetch a remote image and store it in our uploads bucket.
 * Returns the public URL, or null if the fetch/upload fails.
 */
async function mirrorRemoteImageUrl(url, folder = 'listings') {
  const raw = String(url || '').trim();
  if (!/^https?:\/\//i.test(raw)) return null;
  if (isOurStorageUrl(raw)) return raw;

  try {
    const fetched = await fetchRemoteImageBuffer(raw);
    if (!fetched) return null;

    const [publicUrl] = await uploadBuffersToSupabase(
      [{ buffer: fetched.buffer, originalname: `remote.${fetched.ext}`, mimetype: fetched.mime }],
      folder,
    );
    return publicUrl || null;
  } catch (err) {
    console.warn('mirrorRemoteImageUrl failed:', raw.slice(0, 120), err?.message || err);
    return null;
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
  fetchRemoteImageBuffer,
  mirrorRemoteImageUrl,
  mirrorRemoteImageUrls,
};
